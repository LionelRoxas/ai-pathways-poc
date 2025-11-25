/**
 * Run Database Migrations
 * 
 * This script runs all SQL migrations using Node.js (no psql required)
 * 
 * Usage:
 *   npx tsx scripts/run-migrations.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Create database connection pool
 */
function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL not found in environment');
    console.error('Please add it to your .env file');
    process.exit(1);
  }
  
  console.log('🔌 Connecting to database...');
  
  return new Pool({
    connectionString: databaseUrl,
    max: 5,
    ssl: databaseUrl.includes('sslmode=require') || databaseUrl.includes('neon.tech') || databaseUrl.includes('supabase')
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

/**
 * Run a migration file
 */
async function runMigration(pool: Pool, filename: string): Promise<void> {
  const filepath = join(process.cwd(), 'db', 'migrations', filename);
  
  console.log(`\n📄 Running migration: ${filename}`);
  
  try {
    const sql = readFileSync(filepath, 'utf-8');
    
    // Just run the entire SQL file as one query
    // PostgreSQL can handle multiple statements separated by semicolons
    await pool.query(sql);
    
    console.log(`✅ Migration complete: ${filename}`);
  } catch (error: any) {
    console.error(`❌ Migration failed: ${filename}`);
    console.error(error.message);
    
    // If it's a "does not exist" error for DROP, it's okay - continue
    if (error.message.includes('does not exist') && error.message.includes('DROP')) {
      console.log(`⚠️  Warning: ${error.message} (this is okay for first run)`);
      console.log(`✅ Continuing migration...`);
    } else {
      throw error;
    }
  }
}

/**
 * Verify setup
 */
async function verifySetup(pool: Pool): Promise<void> {
  console.log('\n🔍 Verifying setup...\n');
  
  // Check pgvector extension
  const extResult = await pool.query(`
    SELECT extname, extversion 
    FROM pg_extension 
    WHERE extname = 'vector'
  `);
  
  if (extResult.rows.length > 0) {
    console.log(`✅ pgvector extension installed (version ${extResult.rows[0].extversion})`);
  } else {
    console.log('⚠️  pgvector extension not found');
  }
  
  // Check programs table
  const tableResult = await pool.query(`
    SELECT table_name, 
           (SELECT count(*) FROM information_schema.columns WHERE table_name = 'programs') as column_count
    FROM information_schema.tables 
    WHERE table_name = 'programs'
  `);
  
  if (tableResult.rows.length > 0) {
    console.log(`✅ programs table exists (${tableResult.rows[0].column_count} columns)`);
    
    // Check for embedding column
    const embeddingResult = await pool.query(`
      SELECT column_name, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'programs' AND column_name = 'embedding'
    `);
    
    if (embeddingResult.rows.length > 0) {
      console.log(`✅ embedding column configured (type: ${embeddingResult.rows[0].udt_name})`);
    }
  } else {
    console.log('⚠️  programs table not found');
  }
  
  // Check indexes
  const indexResult = await pool.query(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'programs'
  `);
  
  if (indexResult.rows.length > 0) {
    console.log(`✅ ${indexResult.rows.length} indexes created`);
    indexResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
  }
  
  console.log('\n');
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting database migrations...\n');
  
  const pool = createPool();
  
  try {
    // Test connection
    console.log('🧪 Testing connection...');
    const result = await pool.query('SELECT version()');
    const version = result.rows[0].version;
    console.log(`✅ Connected to PostgreSQL`);
    console.log(`   ${version.split(',')[0]}\n`);
    
    // Run migrations
    const migrations = [
      '001_enable_pgvector.sql',
      '002_create_programs_table.sql',
    ];
    
    for (const migration of migrations) {
      await runMigration(pool, migration);
    }
    
    // Verify setup
    await verifySetup(pool);
    
    console.log('✅ All migrations completed successfully!\n');
    console.log('📋 Next step: Generate embeddings');
    console.log('   Run: npx tsx scripts/generate-embeddings.ts\n');
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);
