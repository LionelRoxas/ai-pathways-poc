/**
 * Diagnose pgVector Query Performance
 * 
 * This script checks if the HNSW index is being used and measures query performance
 */

import pg from "pg";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const { Pool } = pg;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function diagnosePerformance() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('\n🔍 Diagnosing pgVector Performance...\n');
    
    // 1. Check if HNSW index exists
    console.log('1️⃣ Checking for HNSW index...');
    const indexCheck = await pool.query(`
      SELECT 
        indexname, 
        indexdef 
      FROM pg_indexes 
      WHERE tablename = 'programs' 
        AND indexdef LIKE '%hnsw%';
    `);
    
    if (indexCheck.rowCount === 0) {
      console.log('❌ HNSW index NOT found! This is why queries are slow.');
      console.log('   Run: db/migrations/002_create_programs_table.sql');
    } else {
      console.log('✅ HNSW index found:');
      indexCheck.rows.forEach(row => {
        console.log(`   ${row.indexname}`);
      });
    }
    
    // 2. Generate a test embedding
    console.log('\n2️⃣ Generating test embedding...');
    const startEmbed = Date.now();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'computer science',
    });
    const embedding = response.data[0].embedding;
    const embedTime = Date.now() - startEmbed;
    console.log(`✅ Embedding generated in ${embedTime}ms`);
    
    // 3. Test query WITHOUT similarity filter (slow)
    console.log('\n3️⃣ Testing query WITHOUT similarity filter in WHERE...');
    const startSlow = Date.now();
    const slowQuery = `
      SELECT 
        program_desc,
        1 - (embedding <=> $1::vector) as similarity
      FROM programs
      ORDER BY embedding <=> $1::vector
      LIMIT 100;
    `;
    await pool.query(slowQuery, [`[${embedding.join(',')}]`]);
    const slowTime = Date.now() - startSlow;
    console.log(`⏱️  Time: ${slowTime}ms`);
    
    // 4. Test query WITH similarity filter (should be faster)
    console.log('\n4️⃣ Testing query WITH similarity filter in WHERE...');
    const startFast = Date.now();
    const fastQuery = `
      SELECT 
        program_desc,
        1 - (embedding <=> $1::vector) as similarity
      FROM programs
      WHERE (1 - (embedding <=> $1::vector)) >= $2
      ORDER BY embedding <=> $1::vector
      LIMIT 50;
    `;
    await pool.query(fastQuery, [`[${embedding.join(',')}]`, 0.35]);
    const fastTime = Date.now() - startFast;
    console.log(`⏱️  Time: ${fastTime}ms`);
    
    // 5. EXPLAIN ANALYZE to see query plan
    console.log('\n5️⃣ Running EXPLAIN ANALYZE...');
    const explainQuery = `
      EXPLAIN ANALYZE
      SELECT 
        program_desc,
        1 - (embedding <=> $1::vector) as similarity
      FROM programs
      WHERE (1 - (embedding <=> $1::vector)) >= $2
      ORDER BY embedding <=> $1::vector
      LIMIT 50;
    `;
    const explainResult = await pool.query(explainQuery, [`[${embedding.join(',')}]`, 0.35]);
    console.log('\n📊 Query Plan:');
    explainResult.rows.forEach(row => {
      console.log(`   ${row['QUERY PLAN']}`);
    });
    
    // 6. Check table statistics
    console.log('\n6️⃣ Table Statistics:');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        pg_size_pretty(pg_total_relation_size('programs')) as total_size,
        pg_size_pretty(pg_relation_size('programs')) as table_size,
        pg_size_pretty(pg_indexes_size('programs')) as indexes_size
      FROM programs;
    `);
    console.log(`   Total Rows: ${stats.rows[0].total_rows}`);
    console.log(`   Total Size: ${stats.rows[0].total_size}`);
    console.log(`   Table Size: ${stats.rows[0].table_size}`);
    console.log(`   Indexes Size: ${stats.rows[0].indexes_size}`);
    
    // 7. Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE SUMMARY');
    console.log('='.repeat(80));
    console.log(`Embedding Generation: ${embedTime}ms`);
    console.log(`Query WITHOUT filter: ${slowTime}ms ${slowTime > 2000 ? '⚠️ SLOW' : '✅'}`);
    console.log(`Query WITH filter: ${fastTime}ms ${fastTime > 1000 ? '⚠️ SLOW' : '✅ FAST'}`);
    
    if (slowTime > 3000) {
      console.log('\n⚠️  ISSUE DETECTED:');
      console.log('   Queries are taking too long (>3 seconds)');
      console.log('\n💡 Possible Causes:');
      console.log('   1. HNSW index not created or not being used');
      console.log('   2. Database connection latency (Neon cold start)');
      console.log('   3. Table not properly indexed');
      console.log('   4. Too many rows being scanned');
      console.log('\n🔧 Solutions:');
      console.log('   1. Check EXPLAIN ANALYZE output above for "Index Scan using programs_embedding_idx"');
      console.log('   2. Ensure m=16, ef_construction=64 in index creation');
      console.log('   3. Add similarity filter in WHERE clause (already done!)');
      console.log('   4. Consider increasing ef_search parameter');
    } else {
      console.log('\n✅ Performance looks good!');
    }
    
  } finally {
    await pool.end();
  }
}

diagnosePerformance().catch(console.error);
