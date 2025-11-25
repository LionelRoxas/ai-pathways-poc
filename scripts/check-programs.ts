import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

async function checkPrograms() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Check business programs on Maui
    console.log('\n🏢 Business programs on Maui:');
    const businessResult = await pool.query(`
      SELECT program_desc, degree_level, campus 
      FROM programs 
      WHERE island = 'Maui' 
      AND (program_desc ILIKE '%business%' OR program_desc ILIKE '%commerce%')
      LIMIT 10
    `);
    console.log(`Found ${businessResult.rowCount} programs`);
    businessResult.rows.forEach(row => {
      console.log(`  - ${row.program_desc} (${row.degree_level}) at ${row.campus}`);
    });
    
    // Check engineering programs anywhere
    console.log('\n🔧 Engineering programs (all islands):');
    const engineeringResult = await pool.query(`
      SELECT program_desc, degree_level, campus, island
      FROM programs 
      WHERE program_desc ILIKE '%engineer%'
      LIMIT 10
    `);
    console.log(`Found ${engineeringResult.rowCount} programs`);
    engineeringResult.rows.forEach(row => {
      console.log(`  - ${row.program_desc} (${row.degree_level}) at ${row.campus}, ${row.island}`);
    });
    
  } finally {
    await pool.end();
  }
}

checkPrograms().catch(console.error);
