/**
 * PERFORMANCE TEST: Vector Verification
 * 
 * This script demonstrates the performance of vector-based verification.
 * Expected: 1-3 seconds for 8 programs vs 20-40 seconds with LLM verification.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { VectorResultVerifier } from '../src/app/lib/agents/vector-result-verifier';

// Mock college programs for testing
const mockCollegePrograms = [
  {
    program: {
      PROGRAM_NAME: 'Computer Science',
      PROGRAM_DESC: 'Study of computation, algorithms, and software development',
      CIP_CODE: '11.0101',
      DEGREE_LEVEL: 'Bachelor',
    },
    campuses: ['University of Hawaii at Manoa'],
  },
  {
    program: {
      PROGRAM_NAME: 'Biology',
      PROGRAM_DESC: 'Study of living organisms and life processes',
      CIP_CODE: '26.0101',
      DEGREE_LEVEL: 'Bachelor',
    },
    campuses: ['University of Hawaii at Hilo'],
  },
  {
    program: {
      PROGRAM_NAME: 'Environmental Science',
      PROGRAM_DESC: 'Study of environmental systems, ecology, and sustainability',
      CIP_CODE: '03.0104',
      DEGREE_LEVEL: 'Bachelor',
    },
    campuses: ['University of Hawaii at Manoa'],
  },
  {
    program: {
      PROGRAM_NAME: 'Marine Biology',
      PROGRAM_DESC: 'Study of ocean life and marine ecosystems',
      CIP_CODE: '26.1302',
      DEGREE_LEVEL: 'Bachelor',
    },
    campuses: ['University of Hawaii at Manoa'],
  },
  {
    program: {
      PROGRAM_NAME: 'Robotics Engineering',
      PROGRAM_DESC: 'Design and development of robotic systems',
      CIP_CODE: '14.0901',
      DEGREE_LEVEL: 'Bachelor',
    },
    campuses: ['University of Hawaii at Manoa'],
  },
  {
    program: {
      PROGRAM_NAME: 'Nursing',
      PROGRAM_DESC: 'Healthcare practice and patient care',
      CIP_CODE: '51.1601',
      DEGREE_LEVEL: 'Bachelor',
    },
    campuses: ['University of Hawaii at Manoa'],
  },
  {
    program: {
      PROGRAM_NAME: 'Business Administration',
      PROGRAM_DESC: 'Study of business management and operations',
      CIP_CODE: '52.0201',
      DEGREE_LEVEL: 'Bachelor',
    },
    campuses: ['University of Hawaii at Manoa'],
  },
  {
    program: {
      PROGRAM_NAME: 'Psychology',
      PROGRAM_DESC: 'Study of human behavior and mental processes',
      CIP_CODE: '42.0101',
      DEGREE_LEVEL: 'Bachelor',
    },
    campuses: ['University of Hawaii at Hilo'],
  },
];

const mockConversation = [
  {
    role: 'user',
    content: 'I am interested in robotics and environmental science',
  },
  {
    role: 'assistant',
    content: 'Great! Let me find some programs for you.',
  },
];

const mockProfile = {
  extracted: {
    interests: ['robotics', 'biology', 'environmental conservation'],
    careerGoals: ['environmental technology', 'robotics engineering'],
    location: 'Hawaii',
  },
};

async function runComparison() {
  console.log('\n🏁 VERIFICATION PERFORMANCE COMPARISON\n');
  console.log('='.repeat(70));
  console.log('\nTest scenario:');
  console.log(`  • Programs to verify: ${mockCollegePrograms.length}`);
  console.log(`  • User query: "robotics biology environmental conservation"`);
  console.log(`  • Conversation context: ${mockConversation.length} messages`);
  console.log(`  • User profile: ${mockProfile.extracted.interests.length} interests`);
  console.log('\n' + '='.repeat(70));

  // Test: Vector Verification Performance
  console.log('\n🚀 Vector-Based Verification');
  const vectorVerifier = new VectorResultVerifier();
  const vectorStart = Date.now();
  
  const vectorResults = await vectorVerifier.verifyCollegePrograms(
    'robotics biology environmental conservation',
    mockCollegePrograms,
    mockConversation as any,
    undefined,
    mockProfile as any
  );
  
  const vectorTime = Date.now() - vectorStart;
  console.log(`   ⏱️  Time: ${vectorTime}ms`);
  console.log(`   📊 Results: ${vectorResults.length} programs passed`);
  console.log(`   🎯 Top 3 scores:`, vectorResults.slice(0, 3).map((r: any) => r.relevanceScore));

  // Comparison with expected LLM time
  console.log('\n' + '='.repeat(70));
  console.log('📈 PERFORMANCE COMPARISON\n');
  
  // Estimate: LLM takes ~3-5 seconds per program for verification
  const estimatedLLMTime = mockCollegePrograms.length * 4000; // 4 seconds per program
  const speedup = (estimatedLLMTime / vectorTime).toFixed(1);
  const timeSaved = estimatedLLMTime - vectorTime;
  const percentFaster = (((estimatedLLMTime - vectorTime) / estimatedLLMTime) * 100).toFixed(1);

  console.log(`Estimated LLM time: ~${estimatedLLMTime}ms (${estimatedLLMTime/1000}s)`);
  console.log(`Vector time:        ${vectorTime}ms (${(vectorTime/1000).toFixed(1)}s)`);
  console.log(`\n✨ Speed Improvement: ~${speedup}x faster`);
  console.log(`⚡ Time Saved: ~${timeSaved}ms (${percentFaster}% faster)`);

  if (parseFloat(speedup) >= 10) {
    console.log(`\n🚀 EXCELLENT: ~${speedup}x speedup is a massive improvement!`);
  } else if (parseFloat(speedup) >= 5) {
    console.log(`\n✅ GREAT: ~${speedup}x speedup is a significant improvement!`);
  } else if (parseFloat(speedup) >= 2) {
    console.log(`\n👍 GOOD: ~${speedup}x speedup is noticeable`);
  }

  console.log('\n💡 For a full pathway query with:');
  console.log(`   • 30 programs to verify`);
  console.log(`   • Estimated LLM time: ~${Math.round((estimatedLLMTime / mockCollegePrograms.length) * 30 / 1000)}s`);
  console.log(`   • Vector time: ~${Math.round((vectorTime / mockCollegePrograms.length) * 30 / 1000)}s`);
  console.log(`   • Time saved: ~${Math.round(((estimatedLLMTime - vectorTime) / mockCollegePrograms.length) * 30 / 1000)}s`);

  console.log('\n' + '='.repeat(70) + '\n');
}

runComparison()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
