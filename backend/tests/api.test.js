import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, validIncident } from './helpers.js';

describe('API REST', () => {
  let server;
  let call;

  before(async () => {
    server = await startTestServer();
    call = server.call;
  });

  after(() => server.close());

  it('GET /api/health responde ok', async () => {
    const { status, body } = await call('GET', '/api/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
  });

  it('GET /api/meta expone catálogos y transiciones', async () => {
    const { body } = await call('GET', '/api/meta');
    assert.deepEqual(body.statuses, ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO']);
    assert.ok(body.transitions.NUEVO.includes('ASIGNADO'));
  });

  it('GET /api/technicians lista técnicos', async () => {
    const { body } = await call('GET', '/api/technicians');
    assert.ok(body.length >= 1);
    assert.ok(body[0].name);
  });

  it('POST /api/incidents crea (201) y GET lo consulta', async () => {
    const created = await call('POST', '/api/incidents', validIncident);
    assert.equal(created.status, 201);
    assert.equal(created.body.status, 'NUEVO');

    const fetched = await call('GET', `/api/incidents/${created.body.id}`);
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body.title, validIncident.title);
    assert.equal(fetched.body.events.length, 1);
  });

  it('POST /api/incidents valida el cuerpo (400)', async () => {
    const { status, body } = await call('POST', '/api/incidents', { title: 'x' });
    assert.equal(status, 400);
    assert.ok(body.details.title);
    assert.ok(body.details.category);
  });

  it('rechaza JSON mal formado (400)', async () => {
    const { status, body } = await call('POST', '/api/incidents', '{no es json');
    assert.equal(status, 400);
    assert.equal(body.error, 'JSON inválido');
  });

  it('flujo completo: asignar, cambiar estado, comentar y filtrar', async () => {
    const { body: created } = await call('POST', '/api/incidents', {
      ...validIncident,
      category: 'RED',
      priority: 'CRITICA',
    });
    const id = created.id;

    const assigned = await call('PATCH', `/api/incidents/${id}/assign`, { technicianId: 1, author: 'Jefe' });
    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.status, 'ASIGNADO');

    const moved = await call('PATCH', `/api/incidents/${id}/status`, { status: 'EN_PROCESO', author: 'Ana' });
    assert.equal(moved.status, 200);
    assert.equal(moved.body.status, 'EN_PROCESO');

    const commented = await call('POST', `/api/incidents/${id}/comments`, {
      author: 'Ana',
      body: 'Cambié el switch',
    });
    assert.equal(commented.status, 201);
    assert.equal(commented.body.events.at(-1).message, 'Cambié el switch');

    const filtered = await call('GET', '/api/incidents?status=EN_PROCESO&priority=CRITICA&category=RED&technicianId=1');
    assert.equal(filtered.status, 200);
    assert.ok(filtered.body.some((i) => i.id === id));
  });

  it('transición inválida responde 409', async () => {
    const { body: created } = await call('POST', '/api/incidents', validIncident);
    const { status } = await call('PATCH', `/api/incidents/${created.id}/status`, { status: 'CERRADO' });
    assert.equal(status, 409);
  });

  it('filtros inválidos responden 400', async () => {
    const { status } = await call('GET', '/api/incidents?status=NOPE');
    assert.equal(status, 400);
  });

  it('GET /api/dashboard devuelve totales y distribuciones', async () => {
    const { status, body } = await call('GET', '/api/dashboard');
    assert.equal(status, 200);
    assert.ok(body.totals.total >= 1);
    assert.ok(Array.isArray(body.byCategory));
    assert.ok(body.byTechnician.some((x) => x.key === 'Sin asignar'));
  });

  it('id inexistente (404), id inválido (400) y ruta desconocida (404)', async () => {
    assert.equal((await call('GET', '/api/incidents/99999')).status, 404);
    assert.equal((await call('GET', '/api/incidents/abc')).status, 400);
    assert.equal((await call('GET', '/api/nada')).status, 404);
  });
});
