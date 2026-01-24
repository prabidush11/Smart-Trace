import { pool } from "./db";

async function nuke() {
  console.log("☢️  Nuking Database Tables...");
  try {
    // CASCADE ensures we kill the links between tables too
    await pool.query("DROP TABLE IF EXISTS scans CASCADE");
    await pool.query("DROP TABLE IF EXISTS labels CASCADE");
    await pool.query("DROP TABLE IF EXISTS batches CASCADE");
    await pool.query("DROP TABLE IF EXISTS users CASCADE"); 
    console.log("✅ Database is empty. Ready for a fresh start.");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await pool.end();
  }
}

nuke();