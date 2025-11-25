/**
 * Test pgVector search performance with the actual search service
 * This uses the same code path as your app
 */

import { PgVectorSearch } from '../src/app/lib/tools/pgvector-search';

async function testLivePerformance() {
  console.log('\n🧪 Testing Live pgVector Performance\n');
  console.log('='.repeat(60));

  const searcher = new PgVectorSearch();

  // Test 1: Simple query
  console.log('\n1️⃣ Test: Simple CS query');
  const start1 = Date.now();
  const results1 = await searcher.semanticSearch('computer science', undefined, {
    maxResults: 100,
    minSimilarity: 0.35,
  });
  const time1 = Date.now() - start1;
  console.log(`   ✅ Found ${results1.length} results in ${time1}ms`);

  // Test 2: Complex query (your actual query)
  console.log('\n2️⃣ Test: Robotics + Biology + Environmental');
  const start2 = Date.now();
  const results2 = await searcher.semanticSearch('robotics biology environmental conservation sustainability technology', undefined, {
    maxResults: 100,
    minSimilarity: 0.35,
  });
  const time2 = Date.now() - start2;
  console.log(`   ✅ Found ${results2.length} results in ${time2}ms`);

  // Test 3: With island filter
  console.log('\n3️⃣ Test: With island filter (Oahu)');
  const start3 = Date.now();
  const results3 = await searcher.semanticSearch('marine biology', 'Oahu', {
    maxResults: 100,
    minSimilarity: 0.35,
  });
  const time3 = Date.now() - start3;
  console.log(`   ✅ Found ${results3.length} results in ${time3}ms`);

  // Test 4: With conversation context
  console.log('\n4️⃣ Test: With conversation context');
  const start4 = Date.now();
  const results4 = await searcher.semanticSearch('environmental programs', undefined, {
    maxResults: 100,
    minSimilarity: 0.35,
    conversationContext: 'User is interested in robotics and biology for conservation work in Hawaii',
  });
  const time4 = Date.now() - start4;
  console.log(`   ✅ Found ${results4.length} results in ${time4}ms`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PERFORMANCE SUMMARY\n');
  console.log(`Simple query:        ${time1}ms (${results1.length} results)`);
  console.log(`Complex query:       ${time2}ms (${results2.length} results)`);
  console.log(`With island filter:  ${time3}ms (${results3.length} results)`);
  console.log(`With context:        ${time4}ms (${results4.length} results)`);
  
  const avgTime = (time1 + time2 + time3 + time4) / 4;
  console.log(`\nAverage query time: ${avgTime.toFixed(0)}ms`);

  if (avgTime < 1000) {
    console.log('\n✅ Performance is EXCELLENT (<1s)');
  } else if (avgTime < 3000) {
    console.log('\n✅ Performance is GOOD (1-3s)');
  } else {
    console.log('\n⚠️  Performance needs improvement (>3s)');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  process.exit(0);
}

testLivePerformance();
