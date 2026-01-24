import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const labels = pgTable("labels", {
  uuid: text("uuid").primaryKey(),
  serialNumber: text("serial_number").notNull().unique(),
  type: text("type").notNull(), // 'unit', 'carton'
  parentUuid: text("parent_uuid"), // Self-reference for Hierarchy
  hash: text("hash").notNull(),
});

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  labelUuid: text("label_uuid").notNull(),
  lat: real("lat").notNull(),
  long: real("long").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  status: text("status").notNull(), // 'valid', 'suspect'
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

export type GenerateBatchRequest = {
  productName: string;
  quantity: number;
};

export type VerifyProductRequest = {
  serialNumber: string;
  lat: number;
  long: number;
};

export type VerifyProductResponse = {
  status: "valid" | "suspect" | "not_found";
  message: string;
  label?: Label;
  lastScan?: Scan;
};
