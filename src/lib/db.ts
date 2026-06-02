// Postgres access for durable cloud state.
//
// The whole app's durable blob (memory + today's plan) is stored as a
// single JSONB row, keyed by workspace id. This mirrors the localStorage
// blob exactly, so the client can treat the DB as a cloud cache of the
// same PersistedData shape — no relational schema to keep in sync.
//
// On Railway, add a Postgres service and reference its DATABASE_URL on the
// app service. Locally, if DATABASE_URL is unset the helpers no-op and the
// app falls back to localStorage, so dev works with no database attached.

import { Pool } from 'pg';

const WORKSPACE_ID = 'default'; // single-tenant for now

// Reuse one pool across hot reloads in dev so we don't leak connections.
const globalForPg = globalThis as unknown as { _pgPool?: Pool };

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  if (!globalForPg._pgPool) {
    // Railway's internal hostname needs no SSL; the public proxy URL does.
    const needsSsl =
      !/localhost|127\.0\.0\.1|\.railway\.internal/.test(url);
    globalForPg._pgPool = new Pool({
      connectionString: url,
      ssl: needsSsl ? { rejectUnauthorized: false } : false,
      max: 5,
    });
  }
  return globalForPg._pgPool;
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(pool: Pool): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS app_state (
           id          TEXT PRIMARY KEY,
           data        JSONB NOT NULL,
           updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
         )`
      )
      .then(() => undefined)
      .catch(err => {
        schemaReady = null; // allow a retry on the next request
        throw err;
      });
  }
  return schemaReady;
}

export function isDbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

// Returns the stored blob, or null when nothing has been saved yet (or no
// DB is configured). The caller treats null as "fall back to local cache".
export async function getState(): Promise<unknown | null> {
  const pool = getPool();
  if (!pool) return null;
  await ensureSchema(pool);

  const { rows } = await pool.query(
    'SELECT data FROM app_state WHERE id = $1',
    [WORKSPACE_ID]
  );
  return rows.length ? rows[0].data : null;
}

// Upsert the blob. No-ops when no DB is configured.
export async function putState(data: unknown): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await ensureSchema(pool);

  await pool.query(
    `INSERT INTO app_state (id, data, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = now()`,
    [WORKSPACE_ID, data]
  );
}
