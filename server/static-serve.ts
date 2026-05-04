import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/**
 * Serves the Vite production build from dist/public (bundled next to dist/index.js).
 * No dependency on the `vite` package — safe for pruned production images.
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
