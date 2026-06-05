import dotenv from "dotenv";
dotenv.config();

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";
import { resolveDatabaseUrl } from "./config";

const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
  max: 10,
});

export const db = drizzle({ client: pool, schema });
