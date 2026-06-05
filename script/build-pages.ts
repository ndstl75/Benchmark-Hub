import { cpSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { build as viteBuild } from "vite";

const root = process.cwd();
const publicDataDir = join(root, "client", "public", "data");
const outDir = join(root, "dist", "public");

const candidates = [
  join(root, "data", "benchmark.json"),
  join(root, "server", "data", "benchmark.json"),
];

const srcJson = candidates.find((p) => existsSync(p));
if (!srcJson) {
  console.error("benchmark.json not found. Expected one of:");
  for (const p of candidates) console.error(`  - ${p}`);
  process.exit(1);
}

process.env.VITE_DEPLOY_MODE = "static";
process.env.VITE_BASE_PATH = "/Benchmark-Hub/";
process.env.NODE_ENV = "production";

mkdirSync(publicDataDir, { recursive: true });
cpSync(srcJson, join(publicDataDir, "benchmark.json"));
console.log(`using ${srcJson}`);

console.log("building client for GitHub Pages...");
await viteBuild();

cpSync(join(outDir, "index.html"), join(outDir, "404.html"));
writeFileSync(join(outDir, ".nojekyll"), "");
console.log("wrote 404.html and .nojekyll in dist/public");
