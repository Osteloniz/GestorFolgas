import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

let client: Sql | undefined;
let database: Database | undefined;

export function getDb(): Database {
  if (database) return database;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");

  client = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  database = drizzle(client, { schema });

  return database;
}

export async function closeDb(): Promise<void> {
  await client?.end();
  client = undefined;
  database = undefined;
}
