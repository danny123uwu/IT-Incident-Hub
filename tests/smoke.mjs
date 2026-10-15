// Prueba de humo de extremo a extremo contra el sistema ya levantado.
// Uso: BASE_URL=http://localhost:8080 node tests/smoke.mjs
import assert from 'node:assert/strict';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 90000);

async function api(method, path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function waitUntilHealthy() {
  const deadline = Date.now() + TIMEOUT_MS;
  let lastError = 'sin respuesta';
  while (Date.now() < deadline) {
    try {
      const { status, body } = await api('GET', '/api/health');
      if (status === 200 && body.status === 'ok') return body;
      lastError = `HTTP ${status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`El sistema no respondió en ${TIMEOUT_MS / 1000}s (${lastError})`);
}

const step = (text) => console.log(`✔ ${text}`);

const health = await waitUntilHealthy();
assert.equal(health.storage, 'postgres', 'el backend debe usar PostgreSQL, no memoria');
step('API saludable y conectada a PostgreSQL');

const page = await fetch(`${BASE_URL}/`);
assert.equal(page.status, 200);
assert.match(await page.text(), /<div id="root">/);
step('Frontend sirve la aplicación');

const technicians = await api('GET', '/api/technicians');
assert.ok(technicians.body.length >= 1, 'debe haber técnicos sembrados');
step('Técnicos sembrados por init.sql');

const marker = `smoke-${Date.now()}`;
const created = await api('POST', '/api/incidents', {
  title: `Prueba de humo ${marker}`,
  description: 'Incidente creado por la prueba de humo automática.',
  category: 'SOFTWARE',
  priority: 'CRITICA',
  reporter: 'Smoke Test',
});
assert.equal(created.status, 201);
const id = created.body.id;
step(`Incidente #${id} creado`);

const assigned = await api('PATCH', `/api/incidents/${id}/assign`, {
  technicianId: technicians.body[0].id,
  author: 'Smoke Test',
});
assert.equal(assigned.body.status, 'ASIGNADO');

for (const status of ['EN_PROCESO', 'RESUELTO', 'CERRADO']) {
  const moved = await api('PATCH', `/api/incidents/${id}/status`, { status, author: 'Smoke Test' });
  assert.equal(moved.status, 200, `cambio a ${status}`);
}
step('Flujo de estados NUEVO → CERRADO');

const commented = await api('POST', `/api/incidents/${id}/comments`, {
  author: 'Smoke Test',
  body: 'Comentario de verificación',
});
assert.equal(commented.status, 201);
assert.equal(commented.body.events.at(-1).kind, 'COMENTARIO');
assert.ok(commented.body.events.length >= 6, 'la bitácora conserva todo el historial');
step('Bitácora con historial completo');

const filtered = await api('GET', '/api/incidents?status=CERRADO&category=SOFTWARE');
assert.ok(filtered.body.some((incident) => incident.id === id));
step('Filtros funcionan');

const dashboard = await api('GET', '/api/dashboard');
assert.ok(dashboard.body.totals.closed >= 1);
assert.equal(dashboard.body.totals.total, dashboard.body.totals.open + dashboard.body.totals.closed);
step('Dashboard coherente');

console.log('\nPrueba de humo completada con éxito.');
