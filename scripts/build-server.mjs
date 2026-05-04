/**
 * Production server bundle: NODE_ENV is fixed at build time so the Vite dev
 * middleware tree-shakes out entirely — Docker images never reference `vite`.
 */
import fs from "fs";
import path from "path";
import * as esbuild from "esbuild";

const distDir = path.join(process.cwd(), "dist");
if (fs.existsSync(distDir)) {
  for (const name of fs.readdirSync(distDir)) {
    if (name === "public") continue;
    if (name.endsWith(".js")) {
      fs.unlinkSync(path.join(distDir, name));
    }
  }
}

await esbuild.build({
  entryPoints: ["server/index.ts"],
  platform: "node",
  packages: "external",
  bundle: true,
  format: "esm",
  outdir: "dist",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
