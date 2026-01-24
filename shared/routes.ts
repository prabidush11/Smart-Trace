import { z } from "zod";
import { insertBatchSchema, batches, scans, labels } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  batches: {
    generate: {
      method: "POST" as const,
      path: "/api/generate",
      input: z.object({
        productName: z.string(),
        quantity: z.number().min(1),
      }),
      responses: {
        201: z.object({
          batchId: z.number(),
          unitsGenerated: z.number(),
          cartonsGenerated: z.number(),
          message: z.string()
        }),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/batches",
      responses: {
        200: z.array(z.custom<typeof batches.$inferSelect>()),
      },
    },
  },
  verify: {
    check: {
      method: "POST" as const,
      path: "/api/verify",
      input: z.object({
        serialNumber: z.string(),
        lat: z.number(),
        long: z.number(),
      }),
      responses: {
        200: z.object({
          status: z.enum(["valid", "suspect", "not_found"]),
          message: z.string(),
          label: z.custom<typeof labels.$inferSelect>().optional(),
          timestamp: z.string().optional(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
};
