import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrl } from "./server/config";

dotenv.config();

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
});
