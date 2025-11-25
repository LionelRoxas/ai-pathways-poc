/**
 * Generate Embeddings for All Programs
 * 
 * This script:
 * 1. Loads all programs from the JSONL file
 * 2. Generates embeddings for each program using OpenAI or Groq
 * 3. Saves embeddings to a JSON file for database insertion
 * 
 * Run this ONCE before populating the database
 * 
 * Usage:
 *   npm install openai  # If using OpenAI
 *   npx tsx scripts/generate-embeddings.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const EMBEDDING_MODEL = 'text-embedding-3-small'; // OpenAI: 1536 dimensions, $0.02/1M tokens
const BATCH_SIZE = 100; // Process 100 programs at a time
const SAVE_INTERVAL = 500; // Save progress every 500 programs

interface Program {
  iro_institution: string;
  program: string;
  program_desc: string;
  degree_level: string;
  cip_code: string;
}

interface ProgramWithEmbedding extends Program {
  embedding: number[];
  embedding_text: string; // The text we embedded
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate text for embedding from program data
 * This is what the LLM will "understand" about the program
 */
function generateEmbeddingText(program: Program): string {
  // Combine the most relevant fields for semantic search
  // This is what users will search for
  const parts = [
    program.program_desc,
    program.program,
    program.degree_level,
  ].filter(Boolean);
  
  return parts.join(' - ');
}

/**
 * Generate embeddings for a batch of programs
 */
async function generateEmbeddingsBatch(
  programs: Program[],
  startIdx: number
): Promise<ProgramWithEmbedding[]> {
  const texts = programs.map(p => generateEmbeddingText(p));
  
  console.log(`[Batch ${Math.floor(startIdx / BATCH_SIZE) + 1}] Generating embeddings for ${programs.length} programs...`);
  
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });
    
    const programsWithEmbeddings: ProgramWithEmbedding[] = programs.map((program, idx) => ({
      ...program,
      embedding: response.data[idx].embedding,
      embedding_text: texts[idx],
    }));
    
    console.log(`[Batch ${Math.floor(startIdx / BATCH_SIZE) + 1}] ✅ Generated ${programsWithEmbeddings.length} embeddings`);
    
    return programsWithEmbeddings;
  } catch (error) {
    console.error(`[Batch ${Math.floor(startIdx / BATCH_SIZE) + 1}] ❌ Error:`, error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting embedding generation...\n');
  
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY not found in environment');
    console.error('Please set it in your .env file or export it:');
    console.error('  export OPENAI_API_KEY="your-api-key"');
    process.exit(1);
  }
  
  // Load programs from JSONL
  const programsPath = join(
    process.cwd(),
    'src/app/lib/data/jsonl/programs_2yr_4yr_noncredit_11_16_2025_cipfilled.json'
  );
  
  console.log(`📂 Loading programs from: ${programsPath}`);
  const programsData = JSON.parse(readFileSync(programsPath, 'utf-8'));
  const programs: Program[] = Array.isArray(programsData) ? programsData : [programsData];
  
  console.log(`📊 Loaded ${programs.length} programs\n`);
  
  // Check if we have a partial save to resume from
  const outputPath = join(process.cwd(), 'db/programs_with_embeddings.json');
  let allProgramsWithEmbeddings: ProgramWithEmbedding[] = [];
  let startFrom = 0;
  
  try {
    const existing = JSON.parse(readFileSync(outputPath, 'utf-8'));
    allProgramsWithEmbeddings = existing;
    startFrom = existing.length;
    console.log(`📝 Resuming from ${startFrom} existing embeddings\n`);
  } catch {
    console.log(`📝 Starting fresh (no existing embeddings found)\n`);
  }
  
  // Process in batches
  const totalBatches = Math.ceil((programs.length - startFrom) / BATCH_SIZE);
  let processedCount = startFrom;
  
  console.log(`🔄 Processing ${programs.length - startFrom} programs in ${totalBatches} batches`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log(`💾 Saving progress every ${SAVE_INTERVAL} programs\n`);
  
  const startTime = Date.now();
  
  for (let i = startFrom; i < programs.length; i += BATCH_SIZE) {
    const batch = programs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    
    try {
      const batchWithEmbeddings = await generateEmbeddingsBatch(batch, i);
      allProgramsWithEmbeddings.push(...batchWithEmbeddings);
      processedCount += batch.length;
      
      // Save progress periodically
      if (processedCount % SAVE_INTERVAL === 0 || i + BATCH_SIZE >= programs.length) {
        writeFileSync(outputPath, JSON.stringify(allProgramsWithEmbeddings, null, 2));
        console.log(`💾 Saved progress: ${processedCount}/${programs.length} programs\n`);
      }
      
      // Progress update
      const progress = ((processedCount / programs.length) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const remaining = ((programs.length - processedCount) / (processedCount - startFrom)) * (Date.now() - startTime) / 1000;
      
      console.log(`📊 Progress: ${progress}% (${processedCount}/${programs.length})`);
      console.log(`⏱️  Elapsed: ${elapsed}s, Estimated remaining: ${remaining.toFixed(0)}s\n`);
      
      // Rate limiting: wait a bit between batches to avoid API limits
      if (i + BATCH_SIZE < programs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`\n❌ Error processing batch ${batchNum}:`, error);
      console.error(`Saving progress and exiting...\n`);
      writeFileSync(outputPath, JSON.stringify(allProgramsWithEmbeddings, null, 2));
      process.exit(1);
    }
  }
  
  // Final save
  writeFileSync(outputPath, JSON.stringify(allProgramsWithEmbeddings, null, 2));
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  
  console.log('\n✅ Embedding generation complete!');
  console.log(`📊 Total programs: ${allProgramsWithEmbeddings.length}`);
  console.log(`⏱️  Total time: ${totalTime}s`);
  console.log(`💾 Saved to: ${outputPath}`);
  console.log(`\n📋 Next step: Run 'npx tsx scripts/populate-pgvector.ts' to populate the database`);
  
  // Calculate estimated cost
  const avgTokensPerProgram = 50; // Rough estimate
  const totalTokens = programs.length * avgTokensPerProgram;
  const costPer1M = 0.02; // $0.02 per 1M tokens for text-embedding-3-small
  const estimatedCost = (totalTokens / 1_000_000) * costPer1M;
  
  console.log(`\n💰 Estimated cost: $${estimatedCost.toFixed(4)}`);
}

// Run the script
main().catch(console.error);
