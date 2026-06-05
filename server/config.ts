import fs from "fs";

/** Resolve DATABASE_URL for local dev vs Docker Compose. */
export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
  const inDocker = fs.existsSync("/.dockerenv");
  if (!inDocker && /@db(?::|\/)/.test(url)) {
    return url.replace("@db:5432", "@localhost:5434");
  }
  return url;
}
