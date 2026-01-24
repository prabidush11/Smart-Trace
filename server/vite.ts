import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  // Fix 1: Cast to 'any' to silence the TypeScript mismatch error
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  } as any;

  const vite = await createViteServer({
    configFile: path.resolve(__dirname, "..", "vite.config.ts"),
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // Fix 2: Using the correct generic middleware syntax for Express 5
  app.use(async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // Always load the fresh template
      let template = fs.readFileSync(clientTemplate, "utf-8");
      
      // Apply Vite transforms
      template = await vite.transformIndexHtml(url, template);
      
      // Serve it
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Fix 3: 'express' is now properly imported, so this line will work
  app.use(express.static(distPath));

  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}