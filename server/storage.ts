import { db } from "./db";
import {
  batches,
  labels,
  scans,
  type InsertBatch,
  type InsertLabel,
  type InsertScan,
  type Label,
  type Scan,
  type Batch,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Batches
  createBatch(batch: InsertBatch): Promise<Batch>;
  getBatches(): Promise<Batch[]>;

  // Labels
  createLabels(labelsData: InsertLabel[]): Promise<void>;
  getLabelBySerial(serial: string): Promise<Label | undefined>;

  // Scans
  createScan(scan: InsertScan): Promise<Scan>;
  getLastScan(labelUuid: string): Promise<Scan | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createBatch(batch: InsertBatch): Promise<Batch> {
    const [newBatch] = await db.insert(batches).values(batch).returning();
    return newBatch;
  }

  async getBatches(): Promise<Batch[]> {
    return await db.select().from(batches).orderBy(desc(batches.createdAt));
  }

  async createLabels(labelsData: InsertLabel[]): Promise<void> {
    if (labelsData.length === 0) return;
    // Insert in chunks to avoid query limits if quantity is large
    const chunkSize = 1000;
    for (let i = 0; i < labelsData.length; i += chunkSize) {
      await db.insert(labels).values(labelsData.slice(i, i + chunkSize));
    }
  }

  async getLabelBySerial(serial: string): Promise<Label | undefined> {
    const [label] = await db.select().from(labels).where(eq(labels.serialNumber, serial));
    return label;
  }

  async createScan(scan: InsertScan): Promise<Scan> {
    const [newScan] = await db.insert(scans).values(scan).returning();
    return newScan;
  }

  async getLastScan(labelUuid: string): Promise<Scan | undefined> {
    const [scan] = await db
      .select()
      .from(scans)
      .where(eq(scans.labelUuid, labelUuid))
      .orderBy(desc(scans.timestamp))
      .limit(1);
    return scan;
  }
}

export const storage = new DatabaseStorage();
