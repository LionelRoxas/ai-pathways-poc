// test-seed-debug.ts
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

const prisma = new PrismaClient();

async function debugSeed() {
  try {
    console.log("1. Starting...");
    
    // Check file exists
    const uhProgramsPath = path.join(process.cwd(), "data", "uh_programs.csv");
    console.log("2. CSV Path:", uhProgramsPath);
    console.log("3. File exists:", fs.existsSync(uhProgramsPath));
    
    if (!fs.existsSync(uhProgramsPath)) {
      console.error("❌ CSV file not found!");
      return;
    }
    
    // Read file
    console.log("4. Reading file...");
    const fileContent = fs.readFileSync(uhProgramsPath, "utf-8");
    console.log("5. File size:", fileContent.length, "characters");
    
    // Parse CSV
    console.log("6. Parsing CSV...");
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    console.log("7. Parsed rows:", parseResult.data.length);
    console.log("8. First row:", parseResult.data[0]);
    
    // Test database connection
    console.log("9. Testing database...");
    const count = await prisma.uHProgram.count();
    console.log("10. Current UH Programs in DB:", count);
    
    // Try inserting one record
    console.log("11. Inserting test record...");
    const testRecord = await prisma.uHProgram.create({
      data: {
        campus: "Test Campus",
        program: "TEST",
        degree: "BS",
        programName: "Test Program",
        searchKeywords: [],
        relevanceScore: 0,
      }
    });
    console.log("12. Created test record:", testRecord.id);
    
    // Clean up
    await prisma.uHProgram.delete({ where: { id: testRecord.id } });
    console.log("13. ✅ Everything working!");
    
  } catch (error) {
    console.error("❌ Error at step:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSeed();