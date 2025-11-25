import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

async function checkIslands() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Check unique island values
    const islandsResult = await pool.query(`
      SELECT DISTINCT island, COUNT(*) as count
      FROM programs
      GROUP BY island
      ORDER BY count DESC;
    `);
    
    console.log("\n📍 Island values in database:");
    console.log(islandsResult.rows);
    
    // Check unique campus values
    const campusResult = await pool.query(`
      SELECT DISTINCT campus, COUNT(*) as count
      FROM programs
      GROUP BY campus
      ORDER BY count DESC
      LIMIT 20;
    `);
    
    console.log("\n🏫 Campus values in database (top 20):");
    console.log(campusResult.rows);
    
    // Sample some programs to see the data
    const sampleResult = await pool.query(`
      SELECT iro_institution, island, campus, program_desc
      FROM programs
      LIMIT 10;
    `);
    
    console.log("\n📋 Sample programs:");
    console.log(sampleResult.rows);
    
  } finally {
    await pool.end();
  }
}

checkIslands().catch(console.error);
