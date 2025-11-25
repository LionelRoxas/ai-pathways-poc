import pg from 'pg';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function diagnose() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    console.log('\n🔍 pgVector Performance Diagnostic\n');
    console.log('='.repeat(60));

    // 1. Check index exists
    console.log('\n1️⃣ Checking HNSW index...');
    const indexCheck = await pool.query(`
      SELECT 
        tablename, 
        indexname, 
        indexdef
      FROM pg_indexes
      WHERE tablename = 'programs'
        AND indexdef LIKE '%hnsw%';
    `);
    
    if (indexCheck.rows.length > 0) {
      console.log('   ✅ HNSW index exists:');
      indexCheck.rows.forEach(row => {
        console.log(`      ${row.indexname}`);
        console.log(`      ${row.indexdef}`);
      });
    } else {
      console.log('   ❌ No HNSW index found!');
    }

    // 2. Generate test embedding
    console.log('\n2️⃣ Generating test embedding...');
    const embStart = Date.now();
    const embResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'computer science robotics environmental biology',
    });
    const embedding = embResponse.data[0].embedding;
    const embTime = Date.now() - embStart;
    console.log(`   ⏱️  Embedding generated in ${embTime}ms`);

    // 3. Test query WITHOUT similarity filter (baseline)
    console.log('\n3️⃣ Testing query WITHOUT similarity filter...');
    const query1Start = Date.now();
    const result1 = await pool.query(`
      SELECT 
        iro_institution, program, program_desc,
        degree_level, cip_code, campus, island,
        1 - (embedding <=> $1::vector) as similarity
      FROM programs
      WHERE 1=1
      ORDER BY embedding <=> $1::vector
      LIMIT 100;
    `, [JSON.stringify(embedding)]);
    const query1Time = Date.now() - query1Start;
    console.log(`   ⏱️  Query returned ${result1.rows.length} results in ${query1Time}ms`);
    console.log(`   📊 Similarity range: ${result1.rows[result1.rows.length-1]?.similarity.toFixed(3)} - ${result1.rows[0]?.similarity.toFixed(3)}`);

    // 4. Test query WITH similarity filter (optimized)
    console.log('\n4️⃣ Testing query WITH similarity filter...');
    const query2Start = Date.now();
    const result2 = await pool.query(`
      SELECT 
        iro_institution, program, program_desc,
        degree_level, cip_code, campus, island,
        1 - (embedding <=> $1::vector) as similarity
      FROM programs
      WHERE (1 - (embedding <=> $1::vector)) >= $2
      ORDER BY embedding <=> $1::vector
      LIMIT 100;
    `, [JSON.stringify(embedding), 0.35]);
    const query2Time = Date.now() - query2Start;
    console.log(`   ⏱️  Query returned ${result2.rows.length} results in ${query2Time}ms`);
    if (result2.rows.length > 0) {
      console.log(`   📊 Similarity range: ${result2.rows[result2.rows.length-1]?.similarity.toFixed(3)} - ${result2.rows[0]?.similarity.toFixed(3)}`);
    }

    // 5. EXPLAIN ANALYZE to check query plan
    console.log('\n5️⃣ Running EXPLAIN ANALYZE...');
    const explainResult = await pool.query(`
      EXPLAIN ANALYZE
      SELECT 
        iro_institution, program, program_desc,
        degree_level, cip_code, campus, island,
        1 - (embedding <=> $1::vector) as similarity
      FROM programs
      WHERE (1 - (embedding <=> $1::vector)) >= $2
      ORDER BY embedding <=> $1::vector
      LIMIT 100;
    `, [JSON.stringify(embedding), 0.35]);
    
    console.log('\n   📋 Query Execution Plan:');
    explainResult.rows.forEach(row => {
      const plan = row['QUERY PLAN'];
      if (plan.includes('Index Scan') || plan.includes('Seq Scan') || plan.includes('Bitmap')) {
        console.log(`   ${plan}`);
      }
    });

    // 6. Check if index is being used
    const indexUsed = explainResult.rows.some(row => 
      row['QUERY PLAN'].includes('Index Scan using programs_embedding_idx')
    );
    const seqScanUsed = explainResult.rows.some(row => 
      row['QUERY PLAN'].includes('Seq Scan on programs')
    );

    console.log('\n6️⃣ Index Usage Analysis:');
    if (indexUsed) {
      console.log('   ✅ HNSW index IS being used');
    } else if (seqScanUsed) {
      console.log('   ❌ Sequential scan detected - index NOT being used!');
    } else {
      console.log('   ⚠️  Unclear - check execution plan above');
    }

    // 7. Database statistics
    console.log('\n7️⃣ Database Statistics:');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        pg_size_pretty(pg_total_relation_size('programs')) as table_size,
        pg_size_pretty(pg_indexes_size('programs')) as indexes_size
      FROM programs;
    `);
    console.log(`   📊 Total rows: ${stats.rows[0].total_rows}`);
    console.log(`   💾 Table size: ${stats.rows[0].table_size}`);
    console.log(`   📑 Indexes size: ${stats.rows[0].indexes_size}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE SUMMARY\n');
    console.log(`Embedding generation: ${embTime}ms`);
    console.log(`Query without filter: ${query1Time}ms (${result1.rows.length} results)`);
    console.log(`Query with filter:    ${query2Time}ms (${result2.rows.length} results)`);
    console.log(`Index being used:     ${indexUsed ? 'YES ✅' : 'NO ❌'}`);
    
    console.log('\n💡 RECOMMENDATIONS:\n');
    if (query2Time > 2000) {
      console.log('⚠️  Query time >2s is too slow!');
      if (!indexUsed) {
        console.log('   → HNSW index is not being used - WHERE clause may be preventing it');
        console.log('   → Try removing similarity filter from WHERE clause');
        console.log('   → Or adjust index parameters (ef_search)');
      } else {
        console.log('   → Index is being used but still slow');
        console.log('   → Consider increasing ef_search parameter');
        console.log('   → Check Neon connection latency');
      }
    } else if (query2Time < 500) {
      console.log('✅ Performance is excellent!');
    } else {
      console.log('✅ Performance is acceptable (0.5-2s)');
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

diagnose();
