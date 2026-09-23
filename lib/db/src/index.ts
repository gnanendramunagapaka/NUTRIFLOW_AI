import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

// Cache pool on globalThis across warm serverless lambdas
const globalForDb = globalThis as unknown as { _pgPool?: pg.Pool };

function createPool(): pg.Pool {
  if (!connectionString) {
    // Return a proxy that fails only when queries are executed, preventing build-time crashes
    return new Proxy({} as pg.Pool, {
      get(_target, prop) {
        if (prop === "connect" || prop === "query" || prop === "on") {
          return () => {
            throw new Error("DATABASE_URL must be set. Ensure the database connection string is configured.");
          };
        }
        return undefined;
      },
    });
  }

  return new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 2 : 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });
}

export const pool = globalForDb._pgPool ?? createPool();

if (connectionString && process.env.NODE_ENV !== "production") {
  globalForDb._pgPool = pool;
}

export const db = connectionString
  ? drizzle(pool, { schema })
  : (new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
      get() {
        throw new Error("DATABASE_URL must be set. Ensure the database connection string is configured.");
      },
    }));

export * from "./schema";

