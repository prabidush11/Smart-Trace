import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

// Helper for distance calculation (Haversine formula)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Feature A: Generate Batch
  app.post(api.batches.generate.path, async (req, res) => {
    try {
      const { productName, quantity } = api.batches.generate.input.parse(req.body);

      // Create Batch Record
      const batch = await storage.createBatch({
        productName,
        quantity,
      });

      const labelsToInsert = [];
      const salt = "salty_secret"; // In prod, use env var
      
      let currentCartonUuid: string | null = null;

      // Logic: Every 10 Units must be linked to 1 Carton via parent_uuid.
      // We generate units, and every 10th unit starts a new carton? 
      // Or we generate 1 carton, then 10 units linked to it?
      // "Every 10 Units must be linked to 1 Carton" -> implies for every 10 units, there is 1 carton.
      // Let's create a carton first, then 10 units. Repeat.

      let unitsGenerated = 0;
      let cartonsGenerated = 0;

      for (let i = 0; i < quantity; i++) {
        // Create a carton every 10 units (at 0, 10, 20...)
        if (i % 10 === 0) {
          const cartonUuid = uuidv4();
          const cartonSerial = `CTN-${Date.now()}-${cartonsGenerated}`;
          const cartonHash = crypto.createHash('sha256').update(cartonSerial + salt).digest('hex');
          
          labelsToInsert.push({
            uuid: cartonUuid,
            serialNumber: cartonSerial,
            type: 'carton',
            parentUuid: null,
            hash: cartonHash
          });
          
          currentCartonUuid = cartonUuid;
          cartonsGenerated++;
        }

        // Create Unit
        const unitUuid = uuidv4();
        const unitSerial = `UNIT-${Date.now()}-${i}`;
        const unitHash = crypto.createHash('sha256').update(unitSerial + salt).digest('hex');

        labelsToInsert.push({
          uuid: unitUuid,
          serialNumber: unitSerial,
          type: 'unit',
          parentUuid: currentCartonUuid, // Link to current carton
          hash: unitHash
        });
        unitsGenerated++;
      }

      await storage.createLabels(labelsToInsert);

      res.status(201).json({
        batchId: batch.id,
        unitsGenerated,
        cartonsGenerated,
        message: `Successfully generated batch with ${unitsGenerated} units and ${cartonsGenerated} cartons.`
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Generate error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Feature B: Verify
  app.post(api.verify.check.path, async (req, res) => {
    try {
      const { serialNumber, lat, long } = api.verify.check.input.parse(req.body);

      const label = await storage.getLabelBySerial(serialNumber);

      if (!label) {
        return res.json({
          status: "not_found",
          message: "Serial number not found in system."
        });
      }

      const lastScan = await storage.getLastScan(label.uuid);
      let status: "valid" | "suspect" = "valid";
      let message = "Product is authentic.";

      // Anti-Counterfeit Logic
      if (lastScan) {
        const lastTime = new Date(lastScan.timestamp!).getTime();
        const currentTime = Date.now();
        const timeDiffHours = (currentTime - lastTime) / (1000 * 60 * 60);
        
        // Avoid division by zero if scans are immediate
        if (timeDiffHours > 0) {
            const distanceKm = getDistanceFromLatLonInKm(lastScan.lat, lastScan.long, lat, long);
            const speed = distanceKm / timeDiffHours;
    
            if (speed > 800) {
              status = "suspect";
              message = `Suspicious activity detected! Speed between scans: ${speed.toFixed(2)} km/h`;
            }
        }
      }

      // Log this scan
      await storage.createScan({
        labelUuid: label.uuid,
        lat,
        long,
        status,
        timestamp: new Date() // Force current time
      });

      res.json({
        status,
        message,
        label,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.batches.list.path, async (req, res) => {
    const batches = await storage.getBatches();
    res.json(batches);
  });

  return httpServer;
}
