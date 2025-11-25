#!/usr/bin/env npx tsx
// Test the fixed vector verifier threshold

import { config } from "dotenv";
config(); // Load .env

import { VectorResultVerifier } from "../src/app/lib/agents/vector-result-verifier";

const verifier = new VectorResultVerifier();

// Mock programs from the failure case
const mockPrograms = [
  {
    program: {
      PROGRAM_NAME: "Hawaiian Studies - Science",
      PROGRAM_DESC: "Study of Hawaiian culture, history, and language",
      CIP_CODE: "05.0202",
      DEGREE_LEVEL: "2-Year",
    },
    campuses: ["UH Maui College"],
  },
  {
    program: {
      PROGRAM_NAME: "Computer Science - General",
      PROGRAM_DESC:
        "Programming, algorithms, software development, computer systems",
      CIP_CODE: "11.0101",
      DEGREE_LEVEL: "4-Year",
    },
    campuses: ["UH Manoa"],
  },
  {
    program: {
      PROGRAM_NAME: "Information Technology",
      PROGRAM_DESC:
        "IT support, networking, systems administration, cybersecurity",
      CIP_CODE: "11.0103",
      DEGREE_LEVEL: "2-Year",
    },
    campuses: ["Honolulu CC"],
  },
  {
    program: {
      PROGRAM_NAME: "Exploring Hawaii State Library Services",
      PROGRAM_DESC: "Learn about library services and resources in Hawaii",
      CIP_CODE: "24.0103",
      DEGREE_LEVEL: "Non-Credit",
    },
    campuses: ["Hawaii CC"],
  },
];

async function test() {
  console.log('\n🧪 Testing Vector Verifier with "computer science" query\n');
  console.log("📝 Testing with", mockPrograms.length, "programs:");
  mockPrograms.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.program.PROGRAM_NAME} (CIP ${p.program.CIP_CODE})`);
  });

  const result = await verifier.verifyCollegePrograms(
    "i want computer science", // userQuery
    mockPrograms, // programs
    [], // conversationHistory
    undefined, // extractedIntent
    undefined // userProfile
  );

  console.log("\n📊 Results:");
  console.log("Kept:", result.length, "/", mockPrograms.length, "programs\n");

  if (result.length > 0) {
    result.forEach((r: any, i: number) => {
      console.log(`${i + 1}. ${r.program.PROGRAM_NAME}`);
      console.log(`   Score: ${r.relevanceScore.toFixed(1)}/10`);
      console.log(`   CIP: ${r.program.CIP_CODE}\n`);
    });
  } else {
    console.log("   (No programs passed threshold)\n");
  }

  // Check if Hawaiian Studies was filtered out
  const hasHawaiian = result.some((r: any) =>
    r.program.PROGRAM_NAME.includes("Hawaiian")
  );
  const hasCS = result.some((r: any) =>
    r.program.PROGRAM_NAME.includes("Computer")
  );
  const hasIT = result.some((r: any) =>
    r.program.PROGRAM_NAME.includes("Information Technology")
  );

  console.log("\n✅ Test Results:");
  console.log(
    "   Hawaiian Studies filtered out:",
    !hasHawaiian ? "✓ PASS" : "✗ FAIL (should be filtered)"
  );
  console.log("   Computer Science kept:", hasCS ? "✓ PASS" : "✗ FAIL");
  console.log(
    "   Information Technology kept:",
    hasIT ? "✓ PASS" : "✗ FAIL (related to CS)"
  );

  const passRate = ((result.length / mockPrograms.length) * 100).toFixed(0);
  console.log(`\n📈 Pass Rate: ${passRate}% (should be 50-75%, NOT 99%)`);

  if (!hasHawaiian && (hasCS || hasIT) && result.length <= 3) {
    console.log("\n🎉 TEST PASSED: Threshold filtering works correctly!");
    process.exit(0);
  } else {
    console.log("\n❌ TEST FAILED: Threshold too lenient!");
    process.exit(1);
  }
}

test().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
