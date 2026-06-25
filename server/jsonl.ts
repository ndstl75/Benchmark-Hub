import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const dataDir = () => process.env.DATA_DIR ?? join(process.cwd(), "server", "data");

function jsonlPath(collection: string): string {
  return join(dataDir(), `${collection}.jsonl`);
}

export function readJsonl<T>(collection: string): T[] {
  const path = jsonlPath(collection);
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf-8").trim();
  if (!text) return [];
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export function writeJsonl<T>(collection: string, rows: T[]): void {
  mkdirSync(dataDir(), { recursive: true });
  const content = rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
  writeFileSync(jsonlPath(collection), content, "utf-8");
}

export function nextId<T extends { id: number }>(rows: T[]): number {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

export function jsonlExists(collection: string): boolean {
  const path = jsonlPath(collection);
  return existsSync(path) && readFileSync(path, "utf-8").trim().length > 0;
}
