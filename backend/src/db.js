import pg from 'pg';

export function createPool(connectionString, extra = {}) {
  return new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30000, ...extra });
}

export async function waitForDatabase(pool, { retries = 30, delayMs = 1000, log = console } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      log.warn(`Base de datos no disponible (intento ${attempt}/${retries}): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
