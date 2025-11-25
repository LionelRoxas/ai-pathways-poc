/**
 * Simple CIP Mapping Verification Test
 * Tests the CIP mapping fixes without requiring database or server
 */

import * as fs from 'fs';
import * as path from 'path';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logResult(passed: boolean, message: string) {
  if (passed) {
    log(`✅ PASS: ${message}`, 'green');
  } else {
    log(`❌ FAIL: ${message}`, 'red');
  }
}

interface ProgramMapping {
  PROGRAM_OF_STUDY: string;
  CIP_2DIGIT: string[];
}

async function runTests() {
  let totalTests = 0;
  let passedTests = 0;

  console.log('\n' + '='.repeat(80));
  log('CIP MAPPING FIX VERIFICATION', 'cyan');
  console.log('='.repeat(80) + '\n');

  try {
    // Read the mapping file
    const mappingPath = path.join(__dirname, '../src/app/lib/data/jsonl/highschool_pos_to_cip2digit_mapping.jsonl');
    const mappingContent = fs.readFileSync(mappingPath, 'utf-8');
    const lines = mappingContent.trim().split('\n');
    
    log(`📄 Loaded ${lines.length} program mappings\n`, 'blue');

    // Parse all mappings
    const mappings: ProgramMapping[] = lines.map(line => JSON.parse(line));

    // TEST 1: File structure integrity
    log('TEST 1: File Structure Integrity', 'yellow');
    totalTests++;
    const allValid = mappings.every(m => m.PROGRAM_OF_STUDY && Array.isArray(m.CIP_2DIGIT));
    if (allValid) {
      passedTests++;
      logResult(true, `All ${mappings.length} mappings have valid structure`);
    } else {
      logResult(false, 'Some mappings have invalid structure');
    }
    console.log('');

    // TEST 2: Culinary Arts fix
    log('TEST 2: Culinary Arts CIP Code', 'yellow');
    totalTests++;
    const culinary = mappings.find(m => m.PROGRAM_OF_STUDY.includes('Culinary Arts'));
    if (culinary) {
      log(`   Mapping: ${JSON.stringify(culinary)}`, 'blue');
      const correct = culinary.CIP_2DIGIT.includes('12') && 
                     !culinary.CIP_2DIGIT.some(cip => ['09', '10', '50', '46'].includes(cip));
      if (correct) {
        passedTests++;
        logResult(true, 'Culinary Arts mapped to CIP 12 (Personal/Culinary) ✓');
      } else {
        logResult(false, `Culinary Arts has wrong CIP codes: ${culinary.CIP_2DIGIT.join(', ')}`);
      }
    } else {
      logResult(false, 'Culinary Arts mapping not found');
    }
    console.log('');

    // TEST 3: Construction programs
    log('TEST 3: Construction Programs', 'yellow');
    totalTests++;
    const construction = mappings.find(m => m.PROGRAM_OF_STUDY.includes('Residential & Commercial'));
    if (construction) {
      log(`   Mapping: ${JSON.stringify(construction)}`, 'blue');
      const correct = construction.CIP_2DIGIT.includes('46');
      if (correct) {
        passedTests++;
        logResult(true, 'Construction mapped to CIP 46 (Construction Trades) ✓');
      } else {
        logResult(false, `Construction missing CIP 46: ${construction.CIP_2DIGIT.join(', ')}`);
      }
    } else {
      logResult(false, 'Construction mapping not found');
    }
    console.log('');

    // TEST 4: No cross-contamination
    log('TEST 4: Cross-Contamination Check', 'yellow');
    totalTests++;
    const cip12Programs = mappings.filter(m => m.CIP_2DIGIT.includes('12'));
    const cip46Programs = mappings.filter(m => m.CIP_2DIGIT.includes('46'));
    
    log(`   CIP 12 programs: ${cip12Programs.map(p => p.PROGRAM_OF_STUDY).join(', ')}`, 'blue');
    log(`   CIP 46 programs: ${cip46Programs.map(p => p.PROGRAM_OF_STUDY).join(', ')}`, 'blue');
    
    const culinaryInConstruction = cip46Programs.some(p => p.PROGRAM_OF_STUDY.toLowerCase().includes('culinary'));
    const culinaryInCulinary = cip12Programs.some(p => p.PROGRAM_OF_STUDY.toLowerCase().includes('culinary'));
    
    if (!culinaryInConstruction && culinaryInCulinary) {
      passedTests++;
      logResult(true, 'No cross-contamination: Culinary only in CIP 12, not in CIP 46 ✓');
    } else {
      logResult(false, 'Cross-contamination found!');
    }
    console.log('');

    // TEST 5: Critical program mappings
    log('TEST 5: Critical Program Mappings', 'yellow');
    const criticalTests = [
      { name: 'Automation & Robotics', expected: ['15', '47'], desc: 'Engineering Tech + Mechanics' },
      { name: 'Welding', expected: ['48'], desc: 'Precision Production' },
      { name: 'Nursing Services', expected: ['51'], desc: 'Health Professions' },
      { name: 'Programming', expected: ['11'], desc: 'Computer Science' },
      { name: 'Cybersecurity', expected: ['11', '43'], desc: 'CS + Security' },
      { name: 'Artificial Intelligence', expected: ['11', '30'], desc: 'CS + Interdisciplinary' },
    ];

    for (const test of criticalTests) {
      totalTests++;
      const program = mappings.find(m => m.PROGRAM_OF_STUDY.includes(test.name));
      if (program) {
        const hasAll = test.expected.every(cip => program.CIP_2DIGIT.includes(cip));
        const hasOnly = program.CIP_2DIGIT.every(cip => test.expected.includes(cip));
        
        if (hasAll && hasOnly) {
          passedTests++;
          logResult(true, `${test.name}: ${test.desc} → ${program.CIP_2DIGIT.join(', ')}`);
        } else {
          logResult(false, `${test.name}: Expected [${test.expected.join(', ')}], got [${program.CIP_2DIGIT.join(', ')}]`);
        }
      } else {
        logResult(false, `${test.name}: Not found in mappings`);
      }
    }
    console.log('');

    // TEST 6: No duplicate CIP misassignments
    log('TEST 6: CIP Assignment Sanity Check', 'yellow');
    totalTests++;
    
    const problematicPairs = [
      { prog: 'Culinary', badCIPs: ['46', '15', '47'], reason: 'Construction/Tech' },
      { prog: 'Construction', badCIPs: ['12'], reason: 'Culinary' },
      { prog: 'Nursing', badCIPs: ['11', '15'], reason: 'Tech/Engineering' },
      { prog: 'Computer', badCIPs: ['51', '12'], reason: 'Health/Culinary' },
    ];
    
    let sanityOK = true;
    for (const { prog, badCIPs, reason } of problematicPairs) {
      const programs = mappings.filter(m => m.PROGRAM_OF_STUDY.toLowerCase().includes(prog.toLowerCase()));
      for (const program of programs) {
        const hasBadCIP = program.CIP_2DIGIT.some(cip => badCIPs.includes(cip));
        if (hasBadCIP) {
          logResult(false, `${program.PROGRAM_OF_STUDY} has ${reason} CIP codes: ${program.CIP_2DIGIT.join(', ')}`);
          sanityOK = false;
        }
      }
    }
    
    if (sanityOK) {
      passedTests++;
      logResult(true, 'No inappropriate CIP assignments found ✓');
    }
    console.log('');

    // SUMMARY
    console.log('='.repeat(80));
    log('TEST SUMMARY', 'cyan');
    console.log('='.repeat(80));
    log(`Total Tests: ${totalTests}`, 'blue');
    log(`Passed: ${passedTests}`, 'green');
    log(`Failed: ${totalTests - passedTests}`, totalTests > passedTests ? 'red' : 'green');
    log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'yellow');
    console.log('='.repeat(80));
    
    if (passedTests === totalTests) {
      log('\n🎉 ALL TESTS PASSED! CIP mapping is correct.', 'green');
      log('✅ Culinary Arts now correctly mapped to CIP 12', 'green');
      log('✅ Construction programs remain on CIP 46', 'green');
      log('✅ No cross-contamination between program types\n', 'green');
      process.exit(0);
    } else {
      log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Please review above.\n`, 'red');
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ ERROR during testing: ${error}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
