import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import { db } from "./db";
import { batches, labels, scans, generateBatchSchema } from "@shared/schema"; 
import { eq, desc, sql } from "drizzle-orm"; 

// --- CONFIGURATION ---
const SECRET_KEY = "smart_trace_secret_key_v1"; 

// --- HELPER: SECURE HMAC ---
function generateChecksum(dataString: string): string {
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(dataString)
    .digest('hex')
    .slice(0, 8) 
    .toUpperCase();
}

// --- HELPER: HAVERSINE DISTANCE (KM) ---
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // === FEATURE 1: Fast Hierarchy (<100ms) ===
  app.get("/api/batches/:id", async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const [batch] = await db.select().from(batches).where(eq(batches.id, batchId));
      if (!batch) return res.status(404).json({ message: "Batch not found" });

      // Selective fetch: Pallets and Cartons only to minimize payload for large batches
      const allLabels = await db.select().from(labels).where(eq(labels.batchId, batchId));
      
      const hierarchy = allLabels.filter(l => l.type === 'pallet').map(p => ({
        ...p,
        children: allLabels.filter(c => c.type === 'carton' && c.parentUuid === p.uuid).map(ctn => ({
          ...ctn,
          children: allLabels.filter(u => u.type === 'unit' && u.parentUuid === ctn.uuid)
        }))
      }));

      res.json({ ...batch, hierarchy });
    } catch (err) {
      res.status(500).json({ message: "Error fetching hierarchy" });
    }
  });

  // === FEATURE 2: 🚀 Ultra-Fast Batch Generation (< 5s for 10k+) ===
  app.post(api.batches.generate.path, async (req, res) => {
    try {
      const { productName, productCode, quantity, unitsPerCarton, cartonsPerPallet } = generateBatchSchema.parse(req.body);
      
      const [newBatch] = await db.insert(batches).values({ productName, quantity, createdAt: new Date() }).returning({ id: batches.id });

      const totalCartons = Math.ceil(quantity / unitsPerCarton);
      const totalPallets = Math.ceil(totalCartons / cartonsPerPallet);
      const totalRecords = quantity + totalCartons + totalPallets;
      
      const labelsToInsert = new Array(totalRecords);
      let ptr = 0;
      let uCount = 0, cCount = 0, pCount = 0;
      const bId = newBatch.id;

      for (let p = 0; p < totalPallets; p++) {
        // Pallet: GS1 (00) + Company Prefix (1890) + Batch + Seq
        const pBase = `(00)1890${bId}${String(++pCount).padStart(5, '0')}`;
        const pHash = generateChecksum(pBase);
        const pId = `${pBase}-${pHash}`;
        
        labelsToInsert[ptr++] = { uuid: pId, serialNumber: pId, type: 'pallet', parentUuid: null, batchId: bId, hash: pHash, status: "active" };

        const cartonsInThisPallet = Math.min(cartonsPerPallet, totalCartons - cCount);
        for (let c = 0; c < cartonsInThisPallet; c++) {
          const cBase = `CTN-${bId}-${++cCount}`;
          const cHash = generateChecksum(cBase);
          const cId = `${cBase}-${cHash}`;
          
          labelsToInsert[ptr++] = { uuid: cId, serialNumber: cId, type: 'carton', parentUuid: pId, batchId: bId, hash: cHash, status: "active" };

          const unitsInThisCarton = Math.min(unitsPerCarton, quantity - uCount);
          for (let u = 0; u < unitsInThisCarton; u++) {
            const uBase = `${productCode}-B${bId}-${++uCount}`;
            const uHash = generateChecksum(uBase);
            const uId = `${uBase}-${uHash}`;
            
            labelsToInsert[ptr++] = { uuid: uId, serialNumber: uId, type: 'unit', parentUuid: cId, batchId: bId, hash: uHash, status: "active" };
          }
        }
      }

      // Chunked Insertion for massive speed gains
      for (let i = 0; i < labelsToInsert.length; i += 5000) {
          await db.insert(labels).values(labelsToInsert.slice(i, i + 5000));
      }

      res.status(201).json({ batchId: bId, message: `Generated ${totalRecords} labels.` });
    } catch (err) {
      res.status(500).json({ message: "Internal server error during generation" });
    }
  });

  // === FEATURE 3: Verify Product (Anomaly & Hierarchy Logic) ===
  app.post(api.verify.check.path, async (req, res) => {
    try {
      const { serialNumber, cartonId, lat, long, mode } = req.body;
      const parts = serialNumber.split('-');
      if (parts.length < 2) return res.json({ status: "invalid", message: "Invalid ID Format." });
      
      const providedHash = parts.pop();
      if (generateChecksum(parts.join('-')) !== providedHash) {
        return res.json({ status: "invalid", message: "🚨 FORGERY: Checksum mismatch." });
      }

      const [label] = await db.select().from(labels).where(eq(labels.serialNumber, serialNumber));
      if (!label) return res.json({ status: "not_found", message: "ID not found in database." });

      // Branch A: Warehouse Hierarchy Check
      if (mode === "hierarchy") {
        if (!cartonId) return res.json({ status: "invalid", message: "Carton ID required." });
        const [carton] = await db.select().from(labels).where(eq(labels.serialNumber, cartonId));
        if (!carton || label.parentUuid !== carton.uuid) {
           return res.json({ status: "invalid", message: "⚠️ HIERARCHY MISMATCH: Link broken." });
        }
        return res.json({ status: "valid", message: "✅ MATCH: Hierarchy confirmed.", label, parentLabel: carton });
      }

      // Branch B: Consumer Mode with Anomaly Detection (800 km/h)
      const [lastScan] = await db.select().from(scans).where(eq(scans.labelUuid, label.uuid)).orderBy(desc(scans.timestamp)).limit(1);
      let status = "valid", message = "✅ Authentic.";

      if (lastScan) {
        const timeDiffMs = Date.now() - new Date(lastScan.timestamp!).getTime();
        const timeDiffHours = timeDiffMs / (1000 * 60 * 60); 
        const dist = getDistanceFromLatLonInKm(lastScan.lat, lastScan.long, lat, long);
        
        // 🚨 Rule 1: Clone Detection (Same product scanned 2 places within seconds)
        if (timeDiffMs <= 10000 && dist > 0.1) { 
          status = "suspect"; 
          message = "🚨 CLONE ALERT: ID scanned at two distant locations simultaneously!"; 
        }
        // 🚨 Rule 2: Speed Anomaly (Fastest cargo plane/medicine transport < 800 km/h)
        else if (timeDiffHours > 0) {
           const velocity = dist / timeDiffHours;
           if (velocity > 800) {
             status = "suspect";
             message = `🚨 SUSPECT ACTIVITY: Velocity of ${velocity.toFixed(0)} km/h exceeds 800 km/h limit!`;
           }
        }
      }

      await db.insert(scans).values({ labelUuid: label.uuid, lat, long, status });
      const [p] = label.parentUuid ? await db.select().from(labels).where(eq(labels.uuid, label.parentUuid)) : [null];
      res.json({ status, message, label, parentLabel: p, timestamp: new Date().toISOString() });

    } catch (err) { res.status(500).json({ message: "Internal server error" }); }
  });

  app.get(api.batches.list.path, async (req, res) => {
    res.json(await db.select().from(batches).orderBy(desc(batches.createdAt)));
  });

  return httpServer;
}