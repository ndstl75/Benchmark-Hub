import { cpSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { build as viteBuild } from "vite";

const root = process.cwd();
const publicDataDir = join(root, "client", "public", "data");
const srcJson = join(root, "data", "benchmark.json");
const outDir = join(root, "dist", "public");

process.env.VITE_DEPLOY_MODE = "static";
process.env.VITE_BASE_PATH = "/Benchmark-Hub/";
process.env.NODE_ENV = "production";

mkdirSync(publicDataDir, { recursive: true });
cpSync(srcJson, join(publicDataDir, "benchmark.json"));

console.log("building client for GitHub Pages...");
await viteBuild();

const indexHtml = join(outDir, "index.html");
cpSync(indexHtml, join(outDir, "404.html"));
writeFileSync(join(outDir, ".nojekyll"), "");
console.log("wrote 404.html and .nojekyll in dist/public");
