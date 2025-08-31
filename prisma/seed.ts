// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

const prisma = new PrismaClient();

// Helper function to parse CSV files
async function parseCSV(filePath: string): Promise<any[]> {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}

// Helper to clean and split course strings
function parseCourseList(courseString: string | null): string[] {
  if (!courseString || courseString.trim() === "") return [];
  return courseString
    .split(/[,;]/)
    .map(course => course.trim())
    .filter(course => course.length > 0);
}

// Helper to extract keywords from program names
function generateKeywords(programName: string, cipCategory?: string): string[] {
  const keywords: string[] = [];
  keywords.push(programName.toLowerCase());

  const commonWords = ["of", "in", "and", "the", "for", "with", "a", "an"];
  const words = programName.toLowerCase().split(/\s+/);
  words.forEach(word => {
    if (!commonWords.includes(word) && word.length > 2) {
      keywords.push(word);
    }
  });

  if (cipCategory) {
    keywords.push(cipCategory.toLowerCase());
  }

  return [...new Set(keywords)];
}

// Estimate program duration based on degree type
function estimateDuration(degree: string): string {
  const durationMap: Record<string, string> = {
    "Associate in Applied Science": "2 years",
    "Associate in Science": "2 years",
    "Associate in Arts": "2 years",
    "Bachelor of Applied Science": "4 years",
    "Bachelor of Arts": "4 years",
    "Bachelor of Science": "4 years",
    "Certificate of Achievement": "1 year",
    "Certificate of Competence": "6 months",
    "Certificate of Completion": "3-6 months",
    "Academic Subject Certificate": "1 year",
    "Advanced Professional Certificate": "1-2 years",
  };
  return durationMap[degree] || "2-4 years";
}

// Derive career cluster from program name
function deriveCareerCluster(programName: string): string {
  const clusters: Record<string, string[]> = {
    STEM: [
      "engineering",
      "computer",
      "science",
      "technology",
      "math",
      "physics",
      "chemistry",
      "biology",
      "data",
    ],
    "Health Sciences": [
      "health",
      "medical",
      "nursing",
      "pharmacy",
      "dental",
      "therapy",
      "clinical",
      "patient",
    ],
    Business: [
      "business",
      "accounting",
      "finance",
      "marketing",
      "management",
      "entrepreneurship",
      "administration",
    ],
    "Arts & Humanities": [
      "art",
      "music",
      "theater",
      "literature",
      "history",
      "philosophy",
      "language",
      "creative",
    ],
    Education: [
      "education",
      "teaching",
      "curriculum",
      "early childhood",
      "teacher",
    ],
    Agriculture: [
      "agriculture",
      "farming",
      "veterinary",
      "animal",
      "plant",
      "food",
      "sustainable",
    ],
    "Hospitality & Tourism": [
      "hospitality",
      "tourism",
      "culinary",
      "hotel",
      "travel",
      "restaurant",
    ],
    "Public Service": [
      "public",
      "government",
      "social work",
      "criminal justice",
      "law enforcement",
      "administration",
    ],
    "Architecture & Construction": [
      "architecture",
      "construction",
      "building",
      "design",
      "drafting",
    ],
    Manufacturing: [
      "manufacturing",
      "industrial",
      "production",
      "engineering technology",
    ],
  };

  const lowerName = programName.toLowerCase();
  for (const [cluster, keywords] of Object.entries(clusters)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return cluster;
    }
  }

  return "General Studies";
}

async function seed() {
  console.time("⏱️  Total seeding time");
  console.log("🌱 Starting seed process...\n");

  try {
    // Step 1: Clear existing data
    console.log("🗑️  Clearing existing data...");
    console.time("   Clear time");

    await prisma.$transaction([
      prisma.dOEProgramPathway.deleteMany(),
      prisma.userInteraction.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.userProfile.deleteMany(),
      prisma.dOEProgram.deleteMany(),
      prisma.uHProgram.deleteMany(),
      prisma.survey.deleteMany(),
    ]);

    console.timeEnd("   Clear time");
    console.log("   ✅ Database cleared\n");

    // Step 2: Import UH Programs (using batch insert)
    console.log("📚 Importing UH Programs...");
    console.time("   UH import time");

    const uhProgramsPath = path.join(process.cwd(), "data", "uh_programs.csv");

    if (!fs.existsSync(uhProgramsPath)) {
      throw new Error(`UH Programs CSV not found at: ${uhProgramsPath}`);
    }

    const uhData = await parseCSV(uhProgramsPath);
    console.log(`   Found ${uhData.length} UH programs to import`);

    // Prepare all UH program data
    const uhProgramsData = uhData.map(row => ({
      campus: row.CAMPUS || "Unknown",
      program: row.PROGRAM || "",
      degree: row.DEGREE || "Certificate",
      concentration: row.CONCENTRATION || null,
      programName: row.PROGRAM_NAME || "Unnamed Program",
      cipCode: row.CIP_CODE?.toString() || null,
      cipCategory: row.CIP_2DIGIT_CATEGORY || null,
      description: null,
      requiredCredits: null,
      estimatedDuration: estimateDuration(row.DEGREE || ""),
      deliveryMode: ["in_person"],
      admissionRequirements: [],
      careerOutcomes: [],
      searchKeywords: generateKeywords(
        row.PROGRAM_NAME || "",
        row.CIP_2DIGIT_CATEGORY
      ),
      relevanceScore: 0,
    }));

    // Batch insert all UH programs at once
    const uhResult = await prisma.uHProgram.createMany({
      data: uhProgramsData,
      skipDuplicates: true,
    });

    console.timeEnd("   UH import time");
    console.log(`   ✅ Imported ${uhResult.count} UH programs\n`);

    // Step 3: Import DOE Programs (using batch insert)
    console.log("🎓 Importing DOE Programs of Study...");
    console.time("   DOE import time");

    const doeProgramsPath = path.join(
      process.cwd(),
      "data",
      "doe_programs.csv"
    );

    if (!fs.existsSync(doeProgramsPath)) {
      throw new Error(`DOE Programs CSV not found at: ${doeProgramsPath}`);
    }

    const doeData = await parseCSV(doeProgramsPath);
    console.log(`   Found ${doeData.length} DOE programs to import`);

    // Prepare all DOE program data
    const doeProgramsData = doeData.map(row => ({
      programOfStudy: row["Program of Study"],
      grade9Courses: parseCourseList(row["9th Grade Courses"]),
      grade10Courses: parseCourseList(row["10th Grade Courses"]),
      grade11Courses: parseCourseList(row["11th Grade Courses"]),
      grade12Courses: parseCourseList(row["12th Grade Courses"]),
      electiveCourses: parseCourseList(row["Electives"]),
      gradRequirements: parseCourseList(row["Grad Requirements"]),
      careerCluster: deriveCareerCluster(row["Program of Study"]),
      industryPartners: [],
      certifications: [],
      searchKeywords: generateKeywords(row["Program of Study"]),
      relevanceScore: 0,
    }));

    // Batch insert all DOE programs at once
    const doeResult = await prisma.dOEProgram.createMany({
      data: doeProgramsData,
    });

    console.timeEnd("   DOE import time");
    console.log(`   ✅ Imported ${doeResult.count} DOE programs\n`);

    // Step 4: Create pathway connections
    console.log("🔗 Creating pathway connections...");
    console.time("   Pathway creation time");

    // Get all DOE programs with their IDs
    const doePrograms = await prisma.dOEProgram.findMany();

    // Parse campus connections from the CSV
    const pathwayConnections: any[] = [];

    for (let i = 0; i < doeData.length; i++) {
      const row = doeData[i];
      const doeProgram = doePrograms[i];

      if (!doeProgram) continue;

      const campusColumns = [
        { column: "Hawaii CC Programs", campus: "Hawaii CC" },
        { column: "Honolulu CC Programs", campus: "Honolulu CC" },
        { column: "Kapiolani CC Programs", campus: "Kapiolani CC" },
        { column: "Kauai CC Programs", campus: "Kauai CC" },
        { column: "Leeward CC Programs", campus: "Leeward CC" },
        { column: "UH Maui College Programs", campus: "UH Maui College" },
        { column: "Windward CC Programs", campus: "Windward CC" },
        { column: "UH Manoa Programs", campus: "UH Manoa" },
        { column: "UH West Oahu Programs", campus: "UH West Oahu" },
        { column: "UH Hilo Programs", campus: "UH Hilo" },
      ];

      for (const { column, campus } of campusColumns) {
        const programs = parseCourseList(row[column]);
        for (const programName of programs) {
          if (programName && programName.trim()) {
            pathwayConnections.push({
              doeProgramId: doeProgram.id,
              programName: programName.trim(),
              campus,
            });
          }
        }
      }
    }

    console.log(`   Found ${pathwayConnections.length} potential connections`);

    // Find matching UH programs and create connections
    let connectionCount = 0;
    const pathwayData: any[] = [];

    for (const connection of pathwayConnections) {
      // Try to find matching UH program
      const uhProgram = await prisma.uHProgram.findFirst({
        where: {
          AND: [
            { campus: connection.campus },
            {
              OR: [
                {
                  programName: {
                    contains: connection.programName,
                    mode: "insensitive",
                  },
                },
                {
                  program: {
                    contains: connection.programName,
                    mode: "insensitive",
                  },
                },
              ],
            },
          ],
        },
      });

      if (uhProgram) {
        pathwayData.push({
          doeProgramId: connection.doeProgramId,
          uhProgramId: uhProgram.id,
          campus: connection.campus,
          pathwayType: "direct",
          notes: `Direct pathway from DOE program to ${uhProgram.programName}`,
        });
        connectionCount++;
      }
    }

    // Batch insert all pathways
    if (pathwayData.length > 0) {
      await prisma.dOEProgramPathway.createMany({
        data: pathwayData,
        skipDuplicates: true,
      });
    }

    console.timeEnd("   Pathway creation time");
    console.log(`   ✅ Created ${connectionCount} pathway connections\n`);

    // Step 5: Update relevance scores based on connections
    console.log("📊 Calculating relevance scores...");
    console.time("   Scoring time");

    // Update UH programs with connection counts
    const uhProgramsWithConnections = await prisma.uHProgram.findMany({
      include: {
        _count: {
          select: { doePathways: true },
        },
      },
    });

    // Batch update relevance scores for UH programs
    for (const program of uhProgramsWithConnections) {
      await prisma.uHProgram.update({
        where: { id: program.id },
        data: { relevanceScore: program._count.doePathways * 10 },
      });
    }

    // Update DOE programs with connection counts
    const doeProgramsWithConnections = await prisma.dOEProgram.findMany({
      include: {
        _count: {
          select: { uhPathways: true },
        },
      },
    });

    // Batch update relevance scores for DOE programs
    for (const program of doeProgramsWithConnections) {
      await prisma.dOEProgram.update({
        where: { id: program.id },
        data: { relevanceScore: program._count.uhPathways * 5 },
      });
    }

    console.timeEnd("   Scoring time");
    console.log("   ✅ Relevance scores calculated\n");

    // Step 6: Create sample user profile for testing
    console.log("🧪 Creating sample user profile...");
    const sampleProfile = await prisma.userProfile.create({
      data: {
        sessionId: "sample-session-001",
        educationLevel: "high_school",
        gradeLevel: 11,
        interests: ["technology", "business", "healthcare"],
        careerGoals: ["software developer", "data analyst", "nurse"],
        location: "Oahu",
        timeline: "2_years",
      },
    });
    console.log(`   ✅ Created sample user profile: ${sampleProfile.id}\n`);

    // Final statistics
    const stats = {
      uhPrograms: await prisma.uHProgram.count(),
      doePrograms: await prisma.dOEProgram.count(),
      pathways: await prisma.dOEProgramPathway.count(),
      uhWithConnections: await prisma.uHProgram.count({
        where: { relevanceScore: { gt: 0 } },
      }),
      doeWithConnections: await prisma.dOEProgram.count({
        where: { relevanceScore: { gt: 0 } },
      }),
    };

    console.log("🎉 Seed completed successfully!");
    console.log("📊 Database Statistics:");
    console.log(`   - UH Programs: ${stats.uhPrograms}`);
    console.log(`   - DOE Programs: ${stats.doePrograms}`);
    console.log(`   - Pathway Connections: ${stats.pathways}`);
    console.log(`   - UH Programs with pathways: ${stats.uhWithConnections}`);
    console.log(`   - DOE Programs with pathways: ${stats.doeWithConnections}`);
    console.log("");
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.timeEnd("⏱️  Total seeding time");
  }
}

// Run the seed
seed().catch(error => {
  console.error(error);
  process.exit(1);
});
