import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS (Kept exactly as provided) ===

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const labels = pgTable("labels", {
  uuid: text("uuid").primaryKey(),
  serialNumber: text("serial_number").notNull().unique(),
  type: text("type").notNull(), 
  batchId: integer("batch_id").references(() => batches.id),
  parentUuid: text("parent_uuid"), 
  hash: text("hash").notNull(),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  labelUuid: text("label_uuid").notNull().references(() => labels.uuid),
  lat: real("lat").notNull(),
  long: real("long").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  status: text("status").notNull(), 
});

// === SCHEMAS ===
export const insertBatchSchema = createInsertSchema(batches).omit({ id: true, createdAt: true });
export const insertLabelSchema = createInsertSchema(labels);
export const insertScanSchema = createInsertSchema(scans).omit({ id: true, timestamp: true });

// === TYPES ===
export type Batch = typeof batches.$inferSelect;
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type Label = typeof labels.$inferSelect;
export type InsertLabel = z.infer<typeof insertLabelSchema>;
export type Scan = typeof scans.$inferSelect;
export type InsertScan = z.infer<typeof insertScanSchema>;

// === API CONTRACT TYPES ===

export const generateBatchSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  productCode: z.string().min(1, "Product code is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitsPerCarton: z.number().min(1, "Units per carton must be at least 1"),
  cartonsPerPallet: z.number().min(1, "Cartons per pallet must be at least 1"),
});

export type GenerateBatchRequest = z.infer<typeof generateBatchSchema>;

// ✅ UPDATED: Added 'mode' to enforce logic separation
export const verifyProductSchema = z.object({
  serialNumber: z.string(),
  cartonId: z.string().optional(),
  lat: z.number(),
  long: z.number(),
  mode: z.enum(["consumer", "hierarchy"]), // Ensures strict logic branching
});

export type VerifyProductRequest = z.infer<typeof verifyProductSchema>;

export type VerifyProductResponse = {
  status: "valid" | "suspect" | "invalid" | "not_found";
  message: string;
  label?: Label;
  parentLabel?: Label; 
  lastScan?: Scan;
  timestamp?: string;
};