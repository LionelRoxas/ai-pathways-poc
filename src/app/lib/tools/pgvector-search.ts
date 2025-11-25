/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * pgVector Search Service
 * 
 * Fast semantic search using PostgreSQL vector similarity
 * Replaces the slow LLM-based semantic-program-search.ts
 * 
 * Performance: ~2-5 seconds (vs 60 seconds with LLM ranking)
 * Cost: ~$0.0001 per query (vs $0.001-0.002 with LLM)
 */

import { Pool } from 'pg';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PgVectorSearchResult {
  program: {
    iro_institution: string;
    program: string;
    program_desc: string;
    degree_level: string;
    cip_code: string;
  };
  campus: string;
  similarity: number; // 0-1, higher is better
}

export class PgVectorSearch {
  private pool: Pool;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment');
    }
    
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      ssl: databaseUrl.includes('sslmode=require') || databaseUrl.includes('neon.tech') || databaseUrl.includes('supabase')
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  /**
   * Main search method - replaces semanticSearch from semantic-program-search.ts
   */
  async semanticSearch(
    userQuery: string,
    island?: string,
    options: {
      maxResults?: number;
      minSimilarity?: number;
      conversationContext?: string;
    } = {}
  ): Promise<PgVectorSearchResult[]> {
    const {
      maxResults = 50,
      minSimilarity = 0.35, // 0.35 = 35% similarity threshold (adjusted for better recall)
      conversationContext = '',
    } = options;

    console.log(`[PgVectorSearch] 🔍 Searching for: "${userQuery}"${island ? ` on ${island}` : ''}`);
    const startTime = Date.now();

    try {
      // Step 1: Generate query embedding (fast!)
      const queryEmbedding = await this.getQueryEmbedding(userQuery, conversationContext);
      console.log(`[PgVectorSearch] ✅ Generated query embedding (${Date.now() - startTime}ms)`);

      // Step 2: Vector similarity search in database
      const results = await this.vectorSearch(queryEmbedding, island, maxResults, minSimilarity);
      
      const totalTime = Date.now() - startTime;
      console.log(`[PgVectorSearch] ✅ Found ${results.length} results in ${totalTime}ms`);

      return results;
    } catch (error) {
      console.error('[PgVectorSearch] ❌ Error:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for user query
   * Uses caching to speed up repeated queries
   */
  private async getQueryEmbedding(query: string, context?: string): Promise<number[]> {
    // Combine query with context for better results
    const fullText = context 
      ? `${query}\n\nContext: ${context.substring(0, 500)}` // Limit context to 500 chars
      : query;
    
    // Check cache first
    const cacheKey = fullText.toLowerCase().trim();
    if (this.embeddingCache.has(cacheKey)) {
      console.log(`[PgVectorSearch] 📦 Using cached embedding`);
      return this.embeddingCache.get(cacheKey)!;
    }

    // Generate new embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Fast and cheap: 1536 dimensions
      input: fullText,
    });

    const embedding = response.data[0].embedding;

    // Cache it (limit cache size to 100 entries)
    if (this.embeddingCache.size > 100) {
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey) {
        this.embeddingCache.delete(firstKey);
      }
    }
    this.embeddingCache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Perform vector similarity search in PostgreSQL
   * Uses cosine distance: 1 - (embedding <=> query_embedding)
   */
  private async vectorSearch(
    queryEmbedding: number[],
    island?: string,
    limit: number = 50,
    minSimilarity: number = 0.5
  ): Promise<PgVectorSearchResult[]> {
    // Build filters
    const params: any[] = [`[${queryEmbedding.join(',')}]`, minSimilarity];
    let paramIndex = 3;
    let islandFilter = '';
    
    if (island) {
      islandFilter = `AND island = $${paramIndex}`;
      params.push(island);
      paramIndex++;
    }

    // OPTIMIZED: Apply similarity filter in SQL, not JavaScript!
    const query = `
      SELECT 
        iro_institution,
        program,
        program_desc,
        degree_level,
        cip_code,
        campus,
        island,
        1 - (embedding <=> $1::vector) as similarity
      FROM programs
      WHERE (1 - (embedding <=> $1::vector)) >= $2
        ${islandFilter}
      ORDER BY embedding <=> $1::vector
      LIMIT ${limit}
    `;

    const result = await this.pool.query(query, params);

    // Results are already filtered by SQL
    return result.rows.map(row => ({
        program: {
          iro_institution: row.iro_institution,
          program: row.program,
          program_desc: row.program_desc,
          degree_level: row.degree_level,
          cip_code: row.cip_code,
        },
        campus: row.campus || 'Unknown',
        similarity: parseFloat(row.similarity),
      }));
  }

  /**
   * Get programs by CIP codes (for backward compatibility)
   */
  async getProgramsByCIP(cipCodes: string[], island?: string): Promise<PgVectorSearchResult[]> {
    let islandFilter = '';
    const params: any[] = [cipCodes];
    
    if (island) {
      islandFilter = 'AND island = $2';
      params.push(island);
    }

    const query = `
      SELECT 
        iro_institution,
        program,
        program_desc,
        degree_level,
        cip_code,
        campus,
        island
      FROM programs
      WHERE cip_code = ANY($1) ${islandFilter}
      ORDER BY program_desc
    `;

    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      program: {
        iro_institution: row.iro_institution,
        program: row.program,
        program_desc: row.program_desc,
        degree_level: row.degree_level,
        cip_code: row.cip_code,
      },
      campus: row.campus || 'Unknown',
      similarity: 1.0, // Exact match
    }));
  }

  /**
   * Hybrid search: Combine vector similarity + keyword matching
   * Use this for better accuracy on specific program names
   */
  async hybridSearch(
    userQuery: string,
    island?: string,
    options: {
      maxResults?: number;
      minSimilarity?: number;
      conversationContext?: string;
    } = {}
  ): Promise<PgVectorSearchResult[]> {
    const {
      maxResults = 50,
      minSimilarity = 0.5,
    } = options;

    console.log(`[PgVectorSearch] 🔍 Hybrid search for: "${userQuery}"${island ? ` on ${island}` : ''}`);

    // Get vector search results
    const vectorResults = await this.semanticSearch(userQuery, island, { ...options, maxResults: maxResults * 2 });

    // Get keyword search results
    const keywordResults = await this.keywordSearch(userQuery, island, maxResults);

    // Merge and deduplicate
    const resultMap = new Map<string, PgVectorSearchResult>();
    
    // Add vector results (with similarity scores)
    vectorResults.forEach(result => {
      const key = `${result.program.iro_institution}|${result.program.program}|${result.program.program_desc}`;
      resultMap.set(key, result);
    });

    // Add keyword results (boost similarity if also found in vector search)
    keywordResults.forEach(result => {
      const key = `${result.program.iro_institution}|${result.program.program}|${result.program.program_desc}`;
      if (resultMap.has(key)) {
        // Boost similarity for matches found in both searches
        const existing = resultMap.get(key)!;
        existing.similarity = Math.min(1.0, existing.similarity * 1.2);
      } else {
        resultMap.set(key, result);
      }
    });

    // Sort by similarity and return top results
    return Array.from(resultMap.values())
      .filter(r => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  /**
   * Keyword search using PostgreSQL full-text search
   */
  private async keywordSearch(
    query: string,
    island?: string,
    limit: number = 50
  ): Promise<PgVectorSearchResult[]> {
    let islandFilter = '';
    const params: any[] = [query];
    
    if (island) {
      islandFilter = 'AND island = $2';
      params.push(island);
    }

    const sql = `
      SELECT 
        iro_institution,
        program,
        program_desc,
        degree_level,
        cip_code,
        campus,
        island,
        ts_rank(to_tsvector('english', program_desc || ' ' || program), plainto_tsquery('english', $1)) as rank
      FROM programs
      WHERE to_tsvector('english', program_desc || ' ' || program) @@ plainto_tsquery('english', $1)
        ${islandFilter}
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    const result = await this.pool.query(sql, params);

    return result.rows.map(row => ({
      program: {
        iro_institution: row.iro_institution,
        program: row.program,
        program_desc: row.program_desc,
        degree_level: row.degree_level,
        cip_code: row.cip_code,
      },
      campus: row.campus || 'Unknown',
      similarity: Math.min(1.0, parseFloat(row.rank) * 0.8), // Convert rank to similarity score
    }));
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalPrograms: number;
    programsByIsland: Record<string, number>;
    programsByDegreeLevel: Record<string, number>;
  }> {
    const [totalResult, islandResult, degreeResult] = await Promise.all([
      this.pool.query('SELECT COUNT(*) as count FROM programs'),
      this.pool.query('SELECT island, COUNT(*) as count FROM programs WHERE island IS NOT NULL GROUP BY island'),
      this.pool.query('SELECT degree_level, COUNT(*) as count FROM programs GROUP BY degree_level'),
    ]);

    return {
      totalPrograms: parseInt(totalResult.rows[0].count),
      programsByIsland: Object.fromEntries(
        islandResult.rows.map(row => [row.island, parseInt(row.count)])
      ),
      programsByDegreeLevel: Object.fromEntries(
        degreeResult.rows.map(row => [row.degree_level, parseInt(row.count)])
      ),
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Singleton instance
let pgVectorSearchInstance: PgVectorSearch | null = null;

export function getPgVectorSearch(): PgVectorSearch {
  if (!pgVectorSearchInstance) {
    pgVectorSearchInstance = new PgVectorSearch();
  }
  return pgVectorSearchInstance;
}
