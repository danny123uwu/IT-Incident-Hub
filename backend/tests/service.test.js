import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from '../src/errors.js';
import { createMemoryRepository } from '../src/repository/memory.js';
import { createIncidentService } from '../src/service.js';
import { validIncident } from './fixtures.js';

async function rejectsWith(promise, status, pattern) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof HttpError, 'debe ser HttpError');
    assert.equal(error.status, status);
    if (pattern) assert.match(error.message, pattern);
    return true;
  });
}

describe('IncidentService', () => {
  let service;

  beforeEach(() => {
    service = createIncidentService(createMemoryRepository());
  });

  it('crea incidentes en estado NUEVO con evento de bitácora', async () => {
    const incident = await service.create(validIncident);
    assert.equal(incident.status, 'NUEVO');
    assert.equal(incident.technicianId, null);
    assert.equal(incident.events.length, 1);
    assert.equal(incident.events[0].kind, 'CREADO');
  });

  it('asignar desde NUEVO pasa a ASIGNADO y registra dos eventos', async () => {
    const { id } = await service.create(validIncident);
    const updated = await service.assign(id, { technicianId: 1, author: 'Jefe TI' });
    assert.equal(updated.status, 'ASIGNADO');
    assert.equal(updated.technicianName, 'Ana Morales');
    assert.deepEqual(
      updated.events.map((e) => e.kind),
      ['CREADO', 'ASIGNACION', 'ESTADO'],
    );
  });

  it('no permite asignar un técnico inexistente', async () => {
    const { id } = await service.create(validIncident);
    await rejectsWith(service.assign(id, { technicianId: 999 }), 404, /Técnico/);
  });

  it('exige técnico antes de cambiar de estado', async () => {
    const { id } = await service.create(validIncident);
    await rejectsWith(service.changeStatus(id, { status: 'ASIGNADO' }), 409, /técnico/);
  });

  it('rechaza saltos de estado y estados repetidos', async () => {
    const { id } = await service.create(validIncident);
    await service.assign(id, { technicianId: 1 });
    await rejectsWith(service.changeStatus(id, { status: 'CERRADO' }), 409, /Transición/);
    await rejectsWith(service.changeStatus(id, { status: 'ASIGNADO' }), 409, /ya está/);
  });

  it('recorre el flujo completo hasta CERRADO y luego bloquea cambios', async () => {
    const { id } = await service.create(validIncident);
    await service.assign(id, { technicianId: 2 });
    await service.changeStatus(id, { status: 'EN_PROCESO' });
    await service.changeStatus(id, { status: 'RESUELTO' });
    const closed = await service.changeStatus(id, { status: 'CERRADO' });
    assert.equal(closed.status, 'CERRADO');
    await rejectsWith(service.changeStatus(id, { status: 'EN_PROCESO' }), 409);
    await rejectsWith(service.assign(id, { technicianId: 1 }), 409);
  });

  it('permite reabrir un incidente resuelto', async () => {
    const { id } = await service.create(validIncident);
    await service.assign(id, { technicianId: 1 });
    await service.changeStatus(id, { status: 'EN_PROCESO' });
    await service.changeStatus(id, { status: 'RESUELTO' });
    const reopened = await service.changeStatus(id, { status: 'EN_PROCESO' });
    assert.equal(reopened.status, 'EN_PROCESO');
  });

  it('agrega comentarios a la bitácora', async () => {
    const { id } = await service.create(validIncident);
    const updated = await service.addComment(id, { author: 'Ana', body: 'Revisando el equipo' });
    const last = updated.events.at(-1);
    assert.equal(last.kind, 'COMENTARIO');
    assert.equal(last.message, 'Revisando el equipo');
  });

  it('responde 404 para incidentes inexistentes', async () => {
    await rejectsWith(service.get(123), 404);
    await rejectsWith(service.addComment(123, { author: 'Ana', body: 'x' }), 404);
  });

  it('filtra por estado, prioridad, categoría y técnico', async () => {
    const a = await service.create(validIncident);
    await service.create({ ...validIncident, category: 'RED', priority: 'CRITICA' });
    await service.assign(a.id, { technicianId: 3 });

    assert.equal((await service.list({})).length, 2);
    assert.equal((await service.list({ status: 'ASIGNADO' })).length, 1);
    assert.equal((await service.list({ priority: 'CRITICA' })).length, 1);
    assert.equal((await service.list({ category: 'RED' })).length, 1);
    assert.equal((await service.list({ technicianId: '3' })).length, 1);
    assert.equal((await service.list({ technicianId: '4' })).length, 0);
  });

  it('calcula el dashboard', async () => {
    const a = await service.create({ ...validIncident, priority: 'CRITICA' });
    await service.create({ ...validIncident, category: 'RED' });
    const c = await service.create(validIncident);

    await service.assign(c.id, { technicianId: 1 });
    await service.changeStatus(c.id, { status: 'EN_PROCESO' });
    await service.changeStatus(c.id, { status: 'RESUELTO' });
    await service.changeStatus(c.id, { status: 'CERRADO' });
    await service.assign(a.id, { technicianId: 2 });

    const { totals, byCategory, byTechnician } = await service.dashboard();
    assert.deepEqual(totals, { total: 3, open: 2, closed: 1, critical: 1 });
    assert.equal(byCategory.find((x) => x.key === 'HARDWARE').count, 2);
    assert.equal(byCategory.find((x) => x.key === 'RED').count, 1);
    assert.equal(byTechnician.find((x) => x.key === 'Ana Morales').count, 1);
    assert.equal(byTechnician.find((x) => x.key === 'Sin asignar').count, 1);
  });
});
