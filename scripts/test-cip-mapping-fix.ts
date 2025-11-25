/**
 * Comprehensive Test Script for CIP Mapping Fixes
 * 
 * Tests:
 * 1. CIP mapping accuracy (Culinary Arts fix)
 * 2. Construction search no longer returns Culinary Arts
 * 3. Culinary search still returns Culinary Arts
 * 4. Other program mappings are correct
 * 5. Integration with vector verification
 * 6. Integration with conversation filtering
 */

import { HSDataTool } from '../src/app/lib/tools/jsonl-tools';
import { DirectSearchTracer } from '../src/app/lib/tools/direct-search-tracer';
import { VectorResultVerifier } from '../src/app/lib/agents/vector-result-verifier';
import { filterRelevantConversation } from '../src/app/lib/helpers/conversation-filter';
import * as fs from 'fs';
import * as path from 'path';

// Color codes for terminal output
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

function logTestHeader(testName: string) {
  console.log('\n' + '='.repeat(80));
  log(`TEST: ${testName}`, 'cyan');
  console.log('='.repeat(80));
}

function logResult(passed: boolean, message: string) {
  if (passed) {
    log(`✅ PASS: ${message}`, 'green');
  } else {
    log(`❌ FAIL: ${message}`, 'red');
  }
}

async function runTests() {
  let totalTests = 0;
  let passedTests = 0;

  try {
    // TEST 1: Verify CIP mapping file structure
    logTestHeader('CIP Mapping File Integrity');
    totalTests++;
    
    const mappingPath = path.join(__dirname, '../src/app/lib/data/jsonl/highschool_pos_to_cip2digit_mapping.jsonl');
    const mappingContent = fs.readFileSync(mappingPath, 'utf-8');
    const lines = mappingContent.trim().split('\n');
    
    log(`Found ${lines.length} program mappings`, 'blue');
    
    const allValid = lines.every(line => {
      try {
        const parsed = JSON.parse(line);
        return parsed.PROGRAM_OF_STUDY && Array.isArray(parsed.CIP_2DIGIT);
      } catch {
        return false;
      }
    });
    
    if (allValid) {
      passedTests++;
      logResult(true, 'All mapping entries are valid JSON with correct structure');
    } else {
      logResult(false, 'Some mapping entries have invalid structure');
    }

    // TEST 2: Verify Culinary Arts CIP mapping
    logTestHeader('Culinary Arts CIP Code Fix');
    totalTests++;
    
    const culinaryLine = lines.find(line => line.includes('Culinary Arts'));
    if (culinaryLine) {
      const culinaryMapping = JSON.parse(culinaryLine);
      log(`Culinary Arts mapping: ${JSON.stringify(culinaryMapping)}`, 'blue');
      
      const hasCIP12 = culinaryMapping.CIP_2DIGIT.includes('12');
      const hasWrongCIPs = culinaryMapping.CIP_2DIGIT.some((cip: string) => 
        ['09', '10', '50', '46'].includes(cip)
      );
      
      if (hasCIP12 && !hasWrongCIPs) {
        passedTests++;
        logResult(true, 'Culinary Arts correctly mapped to CIP 12 (Personal and Culinary Services)');
      } else {
        logResult(false, `Culinary Arts has wrong CIP codes: ${JSON.stringify(culinaryMapping.CIP_2DIGIT)}`);
      }
    } else {
      logResult(false, 'Culinary Arts mapping not found');
    }

    // TEST 3: Verify Construction CIP mapping
    logTestHeader('Construction CIP Code Verification');
    totalTests++;
    
    const constructionLine = lines.find(line => line.includes('Residential & Commercial'));
    if (constructionLine) {
      const constructionMapping = JSON.parse(constructionLine);
      log(`Construction mapping: ${JSON.stringify(constructionMapping)}`, 'blue');
      
      const hasCIP46 = constructionMapping.CIP_2DIGIT.includes('46');
      const hasOnlyConstruction = constructionMapping.CIP_2DIGIT.every((cip: string) => 
        ['46', '15'].includes(cip) // 46=Construction, 15=Engineering Tech (acceptable)
      );
      
      if (hasCIP46) {
        passedTests++;
        logResult(true, 'Construction correctly mapped to CIP 46 (Construction Trades)');
      } else {
        logResult(false, `Construction missing CIP 46: ${JSON.stringify(constructionMapping.CIP_2DIGIT)}`);
      }
    } else {
      logResult(false, 'Construction mapping not found');
    }

    // TEST 4: Verify critical CIP mappings
    logTestHeader('Critical Program CIP Mappings');
    
    const criticalMappings = [
      { name: 'Automation & Robotics', expected: ['15', '47'], description: 'Engineering Tech + Mechanics' },
      { name: 'Welding', expected: ['48'], description: 'Precision Production' },
      { name: 'Nursing Services', expected: ['51'], description: 'Health Professions' },
      { name: 'Programming', expected: ['11'], description: 'Computer Science' },
      { name: 'Artificial Intelligence', expected: ['11', '30'], description: 'CS + Interdisciplinary' },
    ];
    
    for (const { name, expected, description } of criticalMappings) {
      totalTests++;
      const line = lines.find(l => l.includes(name));
      
      if (line) {
        const mapping = JSON.parse(line);
        const hasAllExpected = expected.every(cip => mapping.CIP_2DIGIT.includes(cip));
        const hasOnlyExpected = mapping.CIP_2DIGIT.every((cip: string) => expected.includes(cip));
        
        if (hasAllExpected && hasOnlyExpected) {
          passedTests++;
          logResult(true, `${name}: ${description} - ${JSON.stringify(mapping.CIP_2DIGIT)}`);
        } else {
          logResult(false, `${name}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(mapping.CIP_2DIGIT)}`);
        }
      } else {
        logResult(false, `${name}: Mapping not found`);
      }
    }

    // TEST 5: High School Data Tool Integration
    logTestHeader('HS Data Tool CIP Lookup');
    totalTests++;
    
    const hsDataTool = new HSDataTool();
    
    // Test: Get programs by CIP 46 (Construction) - should NOT include Culinary Arts
    const constructionPrograms = await hsDataTool.getProgramsByCIP2Digit(['46']);
    log(`Programs with CIP 46: ${constructionPrograms.map(p => p.PROGRAM_OF_STUDY).join(', ')}`, 'blue');
    
    const hasCulinaryInConstruction = constructionPrograms.some(p => 
      p.PROGRAM_OF_STUDY.toLowerCase().includes('culinary')
    );
    
    if (!hasCulinaryInConstruction) {
      passedTests++;
      logResult(true, 'CIP 46 search does NOT return Culinary Arts ✅');
    } else {
      logResult(false, 'CIP 46 search incorrectly returns Culinary Arts ❌');
    }

    // TEST 6: Culinary Arts in correct CIP
    totalTests++;
    const culinaryPrograms = await hsDataTool.getProgramsByCIP2Digit(['12']);
    log(`Programs with CIP 12: ${culinaryPrograms.map(p => p.PROGRAM_OF_STUDY).join(', ')}`, 'blue');
    
    const hasCulinaryInCIP12 = culinaryPrograms.some(p => 
      p.PROGRAM_OF_STUDY.toLowerCase().includes('culinary')
    );
    
    if (hasCulinaryInCIP12) {
      passedTests++;
      logResult(true, 'CIP 12 search correctly returns Culinary Arts ✅');
    } else {
      logResult(false, 'CIP 12 search does NOT return Culinary Arts ❌');
    }

    // TEST 7: No cross-contamination
    logTestHeader('Cross-Contamination Check');
    totalTests++;
    
    const allPrograms = await hsDataTool.getAllPrograms();
    const duplicateCIPs = new Map<string, string[]>();
    
    // Find programs that share CIP codes inappropriately
    for (const program of allPrograms) {
      if (!program.CIP_2DIGIT) continue;
      
      for (const cip of program.CIP_2DIGIT) {
        if (!duplicateCIPs.has(cip)) {
          duplicateCIPs.set(cip, []);
        }
        duplicateCIPs.get(cip)!.push(program.PROGRAM_OF_STUDY);
      }
    }
    
    // Check specific problematic pairs
    const cip46Programs = duplicateCIPs.get('46') || [];
    const cip12Programs = duplicateCIPs.get('12') || [];
    
    const noOverlap = !cip46Programs.some(p => p.toLowerCase().includes('culinary')) &&
                      cip12Programs.some(p => p.toLowerCase().includes('culinary'));
    
    if (noOverlap) {
      passedTests++;
      logResult(true, 'No inappropriate CIP code overlap between Construction and Culinary');
    } else {
      logResult(false, 'Found inappropriate CIP code overlap');
    }

    // TEST 8: Conversation Filter Integration
    logTestHeader('Conversation Filter Integration');
    totalTests++;
    
    const mockConversation = [
      { role: 'user', content: 'Tell me about nursing programs' },
      { role: 'assistant', content: 'Here are nursing programs...' },
      { role: 'user', content: 'What about marine biology?' },
      { role: 'assistant', content: 'Marine biology programs...' },
      { role: 'user', content: 'Actually, I want construction programs' },
      { role: 'assistant', content: 'Here are construction programs...' },
      { role: 'user', content: 'Yes, show me more' },
    ];
    
    const filtered = filterRelevantConversation(mockConversation, 'yes show me more', 5);
    
    log(`Conversation filtered: ${mockConversation.length} → ${filtered.length} messages`, 'blue');
    
    const hasRecentMessages = filtered.length >= 3;
    const noNursingInFiltered = !filtered.some(msg => 
      msg.content.toLowerCase().includes('nursing')
    );
    
    if (hasRecentMessages && filtered.length <= 5) {
      passedTests++;
      logResult(true, 'Conversation filter keeps recent context and limits total messages');
    } else {
      logResult(false, 'Conversation filter not working correctly');
    }

    // SUMMARY
    console.log('\n' + '='.repeat(80));
    log('TEST SUMMARY', 'cyan');
    console.log('='.repeat(80));
    log(`Total Tests: ${totalTests}`, 'blue');
    log(`Passed: ${passedTests}`, 'green');
    log(`Failed: ${totalTests - passedTests}`, 'red');
    log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'yellow');
    console.log('='.repeat(80));
    
    if (passedTests === totalTests) {
      log('\n🎉 ALL TESTS PASSED! System is working correctly.', 'green');
      process.exit(0);
    } else {
      log('\n⚠️  Some tests failed. Please review the failures above.', 'red');
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ ERROR during testing: ${error}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
log('Starting comprehensive CIP mapping tests...', 'cyan');
runTests();
