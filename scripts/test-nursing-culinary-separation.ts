/**
 * Test: Verify Nursing Query Does NOT Return Culinary Arts
 * 
 * This simulates the exact user query to ensure Culinary Arts
 * doesn't appear when searching for nursing programs.
 */

import { HSDataTool } from '../src/app/lib/tools/jsonl-tools';

async function testNursingQuery() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST: Nursing Query Should NOT Return Culinary Arts');
  console.log('='.repeat(80) + '\n');

  const hsDataTool = new HSDataTool();

  // Test 1: Get programs by CIP 51 (Health Professions - Nursing)
  console.log('1️⃣ Testing CIP 51 (Health Professions)...');
  const nursingPrograms = await hsDataTool.getProgramsByCIP2Digit(['51']);
  console.log(`   Found ${nursingPrograms.length} programs with CIP 51:`);
  nursingPrograms.forEach(p => console.log(`   - ${p.PROGRAM_OF_STUDY}`));
  
  const hasCulinaryInNursing = nursingPrograms.some(p => 
    p.PROGRAM_OF_STUDY.toLowerCase().includes('culinary')
  );
  
  if (hasCulinaryInNursing) {
    console.log('\n❌ FAIL: Culinary Arts found in CIP 51 (Nursing)!');
    console.log('   This means the mapping file is still incorrect.\n');
    process.exit(1);
  } else {
    console.log('\n✅ PASS: No Culinary Arts in CIP 51 (Nursing)\n');
  }

  // Test 2: Get programs by CIP 12 (Culinary)
  console.log('2️⃣ Testing CIP 12 (Personal and Culinary Services)...');
  const culinaryPrograms = await hsDataTool.getProgramsByCIP2Digit(['12']);
  console.log(`   Found ${culinaryPrograms.length} programs with CIP 12:`);
  culinaryPrograms.forEach(p => console.log(`   - ${p.PROGRAM_OF_STUDY}`));
  
  const hasCulinaryInCulinary = culinaryPrograms.some(p => 
    p.PROGRAM_OF_STUDY.toLowerCase().includes('culinary')
  );
  
  if (hasCulinaryInCulinary) {
    console.log('\n✅ PASS: Culinary Arts correctly in CIP 12\n');
  } else {
    console.log('\n❌ FAIL: Culinary Arts NOT found in CIP 12!');
    console.log('   This means Culinary Arts is missing from its correct category.\n');
    process.exit(1);
  }

  // Test 3: Get all programs and check Culinary Arts mapping
  console.log('3️⃣ Checking Culinary Arts direct mapping...');
  const allPrograms = await hsDataTool.getAllPrograms();
  const culinaryArts = allPrograms.find(p => 
    p.PROGRAM_OF_STUDY.toLowerCase().includes('culinary arts')
  );
  
  if (culinaryArts) {
    console.log(`   Found: ${culinaryArts.PROGRAM_OF_STUDY}`);
    console.log(`   CIP Codes: ${JSON.stringify(culinaryArts.CIP_2DIGIT)}`);
    
    const correctMapping = culinaryArts.CIP_2DIGIT?.includes('12') && 
                          !culinaryArts.CIP_2DIGIT?.some(cip => ['51', '46', '15'].includes(cip));
    
    if (correctMapping) {
      console.log('\n✅ PASS: Culinary Arts has correct CIP mapping (12 only)\n');
    } else {
      console.log('\n❌ FAIL: Culinary Arts has incorrect CIP mapping!');
      console.log(`   Expected: ["12"]`);
      console.log(`   Got: ${JSON.stringify(culinaryArts.CIP_2DIGIT)}\n`);
      process.exit(1);
    }
  } else {
    console.log('\n❌ FAIL: Culinary Arts program not found!\n');
    process.exit(1);
  }

  // Final Summary
  console.log('='.repeat(80));
  console.log('✅ ALL TESTS PASSED');
  console.log('='.repeat(80));
  console.log('\n📋 Summary:');
  console.log('   ✅ Culinary Arts is in CIP 12 (Culinary/Personal Services)');
  console.log('   ✅ Culinary Arts is NOT in CIP 51 (Health Professions)');
  console.log('   ✅ CIP mapping file is correct');
  console.log('\n⚠️  If you still see Culinary Arts in nursing queries:');
  console.log('   1. Restart the development server');
  console.log('   2. Clear any caches');
  console.log('   3. Check if database needs repopulation\n');
}

testNursingQuery().catch(error => {
  console.error('\n❌ Error during test:', error);
  process.exit(1);
});
