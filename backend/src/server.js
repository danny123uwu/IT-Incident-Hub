import { createApp } from './app.js';
import { createPool, waitForDatabase } from './db.js';
import { createMemoryRepository } from './repository/memory.js';
import { createPgRepository } from './repository/pg.js';

const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;

let pool;
let repo;

if (databaseUrl) {
  pool = createPool(databaseUrl);
  await waitForDatabase(pool);
  repo = createPgRepository(pool);
  console.info('Almacenamiento: PostgreSQL');
} else {
  repo = createMemoryRepository();
  console.warn('DATABASE_URL no definido: usando almacenamiento EN MEMORIA (solo desarrollo)');
}

const server = createApp({ repo }).listen(port, '0.0.0.0', () => {
  console.info(`API escuchando en el puerto ${port}`);
});

function shutdown(signal) {
  console.info(`${signal} recibido, cerrando…`);
  server.close(async () => {
    await pool?.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
