import fs from "fs";

export const openaiModel = process.env.OPENAI_MODEL || "gpt-5-mini";

/** Resolve DATABASE_URL for local dev vs Docker Compose. */
export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
  // Hostname "db" only resolves inside the Docker Compose network.
  const inDocker = fs.existsSync("/.dockerenv");
  if (!inDocker && /@db(?::|\/)/.test(url)) {
    return url.replace("@db:5432", "@localhost:5447");
  }
  return url;
}
