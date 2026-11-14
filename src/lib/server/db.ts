import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import type { MissionState } from "@/lib/simulation/types";

const globalForDb = globalThis as unknown as { launchLabPool?: Pool; launchLabMemory?: Map<string, MissionState>; launchLabSchemaReady?: boolean };

function pool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production. Configure PostgreSQL before deploying.");
    return null;
  }
  if (!globalForDb.launchLabPool) {
    const createdPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: process.env.VERCEL ? 5 : 8,
      idleTimeoutMillis: process.env.VERCEL ? 5_000 : 30_000,
      connectionTimeoutMillis: 8_000,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: true } : undefined
    });
    // Vercel Fluid Compute closes idle pooled connections before an instance suspends.
    if (process.env.VERCEL) attachDatabasePool(createdPool);
    globalForDb.launchLabPool = createdPool;
  }
  return globalForDb.launchLabPool;
}

async function ensureSchema(db: Pool): Promise<void> {
  if (globalForDb.launchLabSchemaReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS mission_saves (
      id UUID PRIMARY KEY,
      payload JSONB NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS mission_saves_updated_at_idx ON mission_saves(updated_at DESC);
  `);
  globalForDb.launchLabSchemaReady = true;
}

export async function saveMission(state: MissionState): Promise<void> {
  const db = pool();
  if (!db) {
    globalForDb.launchLabMemory ??= new Map<string, MissionState>();
    globalForDb.launchLabMemory.set(state.id, structuredClone(state));
    return;
  }
  await ensureSchema(db);
  await db.query(
    `INSERT INTO mission_saves (id, payload, revision, created_at, updated_at)
     VALUES ($1, $2::jsonb, 1, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload,
       revision = mission_saves.revision + 1, updated_at = NOW()`,
    [state.id, JSON.stringify(state)]
  );
}

export async function loadMission(id: string): Promise<MissionState | null> {
  const db = pool();
  if (!db) {
    globalForDb.launchLabMemory ??= new Map<string, MissionState>();
    const value = globalForDb.launchLabMemory.get(id);
    return value ? structuredClone(value) : null;
  }
  await ensureSchema(db);
  const result = await db.query<{ payload: MissionState }>("SELECT payload FROM mission_saves WHERE id = $1", [id]);
  return result.rows[0]?.payload ?? null;
}

export async function databaseHealth(): Promise<{ mode: "postgres" | "memory"; connected: boolean }> {
  const db = pool();
  if (!db) return { mode: "memory", connected: true };
  await ensureSchema(db);
  await db.query("SELECT 1");
  return { mode: "postgres", connected: true };
}
