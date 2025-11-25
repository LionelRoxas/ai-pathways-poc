/**
 * Populate pgVector Database
 * 
 * This script:
 * 1. Reads programs with embeddings from JSON file
 * 2. Connects to PostgreSQL database
 * 3. Inserts programs into the database in batches
 * 4. Maps institutions to islands/campuses
 * 
 * Prerequisites:
 *   1. Run generate-embeddings.ts first
 *   2. Create database and run migrations
 *   3. Set DATABASE_URL in .env
 * 
 * Usage:
 *   npm install pg
 *   npx tsx scripts/populate-pgvector.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ProgramWithEmbedding {
  iro_institution: string;
  program: string;
  program_desc: string;
  degree_level: string;
  cip_code: string;
  embedding: number[];
  embedding_text: string;
}

interface IslandMapping {
  [key: string]: {
    island: string;
    campus: string;
  };
}

// Batch size for database inserts
const BATCH_SIZE = 100;

/**
 * Create database connection pool
 */
function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL not found in environment');
    console.error('Please set it in your .env file:');
    console.error('  DATABASE_URL="postgresql://user:password@host:5432/dbname"');
    process.exit(1);
  }
  
  return new Pool({
    connectionString: databaseUrl,
    max: 10, // Connection pool size
  });
}

/**
 * Load island mappings from JSONL
 */
function loadIslandMappings(): IslandMapping {
  const campusesPath = join(
    process.cwd(),
    'src/app/lib/data/jsonl/campuses_by_island.jsonl'
  );
  
  console.log(`📂 Loading island mappings from: ${campusesPath}`);
  
  const lines = readFileSync(campusesPath, 'utf-8')
    .split('\n')
    .filter(line => line.trim());
  
  const mapping: IslandMapping = {};
  
  for (const line of lines) {
    const data = JSON.parse(line);
    // Map institution code to island and campus
    mapping[data.iro_institution] = {
      island: data.island,
      campus: data.campus_name,
    };
  }
  
  console.log(`📍 Loaded mappings for ${Object.keys(mapping).length} institutions\n`);
  return mapping;
}

/**
 * Determine program type from degree level
 */
function getProgramType(degreeLevel: string): string {
  const level = (degreeLevel || '').toUpperCase();
  
  if (level.includes('4-YEAR') || level.includes('BACHELOR') || level.includes('BACC')) {
    return '4-Year';
  }
  if (level.includes('2-YEAR') || level.includes('ASSOCIATE')) {
    return '2-Year';
  }
  if (level.includes('NON-CREDIT') || level.includes('NONCREDIT') || level.includes('CERTIFICATE')) {
    return 'Non-Credit';
  }
  
  return 'Other';
}

/**
 * Insert programs into database in batches
 */
async function insertProgramsBatch(
  pool: Pool,
  programs: ProgramWithEmbedding[],
  islandMapping: IslandMapping,
  batchNum: number
): Promise<number> {
  // Remove duplicates within the batch based on unique constraint
  // Include program code + program_desc to preserve all variants
  const uniquePrograms = new Map<string, ProgramWithEmbedding>();
  programs.forEach(program => {
    const key = `${program.iro_institution}|${program.program}|${program.program_desc}|${program.cip_code}`;
    if (!uniquePrograms.has(key)) {
      uniquePrograms.set(key, program);
    }
  });
  
  const deduped = Array.from(uniquePrograms.values());
  
  if (deduped.length < programs.length) {
    console.log(`[Batch ${batchNum}] ⚠️  Removed ${programs.length - deduped.length} duplicates within batch`);
  }
  
  const values: any[] = [];
  const placeholders: string[] = [];
  
  deduped.forEach((program, idx) => {
    const offset = idx * 9; // 9 values per program
    const location = islandMapping[program.iro_institution] || { island: null, campus: null };
    const programType = getProgramType(program.degree_level);
    
    // Always include all 9 columns
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}::vector, $${offset + 7}, $${offset + 8}, $${offset + 9})`
    );
    
    values.push(
      program.iro_institution,
      program.program,
      program.program_desc,
      program.degree_level,
      program.cip_code,
      `[${program.embedding.join(',')}]`, // Convert array to vector format
      programType,
      location.island || null,
      location.campus || null
    );
  });
  
  // Build the SQL query
  const query = `
    INSERT INTO programs (
      iro_institution,
      program,
      program_desc,
      degree_level,
      cip_code,
      embedding,
      program_type,
      island,
      campus
    ) VALUES ${placeholders.join(', ')}
    ON CONFLICT (iro_institution, program, program_desc, cip_code) DO UPDATE SET
      degree_level = EXCLUDED.degree_level,
      embedding = EXCLUDED.embedding,
      program_type = EXCLUDED.program_type,
      island = EXCLUDED.island,
      campus = EXCLUDED.campus,
      updated_at = NOW()
    RETURNING id
  `;
  
  try {
    const result = await pool.query(query, values);
    console.log(`[Batch ${batchNum}] ✅ Inserted ${result.rowCount} programs`);
    return result.rowCount || 0;
  } catch (error) {
    console.error(`[Batch ${batchNum}] ❌ Error:`, error);
    throw error;
  }
}

/**
 * Verify database schema
 */
async function verifySchema(pool: Pool): Promise<boolean> {
  try {
    console.log('🔍 Verifying database schema...\n');
    
    // Check if pgvector extension exists
    const extResult = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `);
    
    if (extResult.rowCount === 0) {
      console.error('❌ pgvector extension not found!');
      console.error('Run: db/migrations/001_enable_pgvector.sql');
      return false;
    }
    
    console.log('✅ pgvector extension installed');
    
    // Check if programs table exists
    const tableResult = await pool.query(`
      SELECT * FROM information_schema.tables 
      WHERE table_name = 'programs'
    `);
    
    if (tableResult.rowCount === 0) {
      console.error('❌ programs table not found!');
      console.error('Run: db/migrations/002_create_programs_table.sql');
      return false;
    }
    
    console.log('✅ programs table exists');
    
    // Check for embedding column with vector type
    const columnResult = await pool.query(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'programs' AND column_name = 'embedding'
    `);
    
    if (columnResult.rowCount === 0) {
      console.error('❌ embedding column not found in programs table!');
      return false;
    }
    
    console.log('✅ embedding column configured\n');
    
    return true;
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting database population...\n');
  
  // Create database connection
  const pool = createPool();
  
  try {
    // Verify schema
    const schemaValid = await verifySchema(pool);
    if (!schemaValid) {
      console.error('\n❌ Schema verification failed. Please run migrations first.');
      process.exit(1);
    }
    
    // Load programs with embeddings
    const embeddingsPath = join(process.cwd(), 'db/programs_with_embeddings.json');
    console.log(`📂 Loading programs with embeddings from: ${embeddingsPath}\n`);
    
    const programs: ProgramWithEmbedding[] = JSON.parse(
      readFileSync(embeddingsPath, 'utf-8')
    );
    
    console.log(`📊 Loaded ${programs.length} programs with embeddings\n`);
    
    // Load island mappings
    const islandMapping = loadIslandMappings();
    
    // Insert in batches
    const totalBatches = Math.ceil(programs.length / BATCH_SIZE);
    let totalInserted = 0;
    
    console.log(`🔄 Inserting ${programs.length} programs in ${totalBatches} batches`);
    console.log(`📦 Batch size: ${BATCH_SIZE}\n`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < programs.length; i += BATCH_SIZE) {
      const batch = programs.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      const inserted = await insertProgramsBatch(pool, batch, islandMapping, batchNum);
      totalInserted += inserted;
      
      // Progress update
      const progress = ((totalInserted / programs.length) * 100).toFixed(1);
      console.log(`📊 Progress: ${progress}% (${totalInserted}/${programs.length})\n`);
      
      // Small delay to avoid overwhelming the database
      if (i + BATCH_SIZE < programs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
    
    console.log('\n✅ Database population complete!');
    console.log(`📊 Total programs inserted: ${totalInserted}`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    
    // Verify data
    const countResult = await pool.query('SELECT COUNT(*) FROM programs');
    console.log(`\n🔍 Verification: ${countResult.rows[0].count} programs in database`);
    
    // Sample query
    const sampleResult = await pool.query(`
      SELECT program_desc, degree_level, island, campus 
      FROM programs 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample programs:');
    sampleResult.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.program_desc} (${row.degree_level}) - ${row.campus || 'Unknown'}, ${row.island || 'Unknown'}`);
    });
    
    console.log('\n📋 Next step: Run verify-migration.ts to test vector search');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);
