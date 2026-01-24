import { db, pool } from "./db";
import { batches, labels } from "@shared/schema";
import crypto from "crypto";
import { generateSSCC } from "./gs1"; // <--- Import the new engine

const MOCK_COMPANY_PREFIX = "8901234"; // 890 is the country code for India

async function seed() {
  console.log("🌱 Seeding database with GS1 Compliant Data...");

  try {
    // 1. Create a Batch
    const [batch] = await db.insert(batches).values({
      productName: "Paracetamol 500mg (Export)",
      quantity: 1000,
      createdAt: new Date(),
    }).returning();

    // 2. Create a Carton with a VALID SSCC
    // We use a counter (e.g., 1001) for the serial reference
    const ssccCode = generateSSCC(MOCK_COMPANY_PREFIX, 1001);
    const cartonHash = crypto.createHash('sha256').update(ssccCode).digest('hex');
    
    const [carton] = await db.insert(labels).values({
      uuid: crypto.randomUUID(),
      serialNumber: ssccCode, // <--- Now stores the 18-digit code
      type: "carton",
      hash: cartonHash,
      batchId: batch.id,
      status: "active"
    }).returning();

    console.log(`✅ Carton Created. SSCC: ${ssccCode}`);

    // 3. Create Units (GTIN-13 or similar)
    for (let i = 1; i <= 5; i++) {
      // For units, we often use SGTIN (GTIN + Serial). 
      // For now, let's keep it simple but structured:
      const unitSerial = `(01)08901234000018(21)${i.toString().padStart(5, '0')}`;
      const unitHash = crypto.createHash('sha256').update(unitSerial).digest('hex');
      
      await db.insert(labels).values({
        uuid: crypto.randomUUID(),
        serialNumber: unitSerial,
        type: "unit",
        parentUuid: carton.uuid,
        hash: unitHash,
        batchId: batch.id,
        status: "active"
      });
    }
    console.log("✅ Units created with Application Identifiers (AI)");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await pool.end();
  }
}

seed();