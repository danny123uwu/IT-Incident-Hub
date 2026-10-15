import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createPool } from '../src/db.js';
import { createPgRepository } from '../src/repository/pg.js';
import { createIncidentService } from '../src/service.js';
import { validIncident } from './fixtures.js';

// Solo corre si hay una base disponible (CI y `incident-hub test`).
// Usa un esquema temporal propio, así que nunca toca los datos reales.
const url = process.env.TEST_DATABASE_URL;
const schemaFile = process.env.SCHEMA_FILE ?? new URL('../../database/init.sql', import.meta.url);

describe('Repositorio PostgreSQL', { skip: url ? false : 'TEST_DATABASE_URL no definido' }, () => {
  const schema = `test_${randomBytes(4).toString('hex')}`;
  let admin;
  let pool;
  let service;

  before(async () => {
    admin = createPool(url, { max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = createPool(url, { options: `-c search_path=${schema}` });
    await pool.query(await readFile(schemaFile, 'utf8'));
    service = createIncidentService(createPgRepository(pool));
  });

  after(async () => {
    await pool?.end();
    await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin?.end();
  });

  it('el esquema siembra técnicos', async () => {
    const technicians = await service.technicians();
    assert.ok(technicians.length >= 1);
  });

  it('crea, asigna, avanza de estado y comenta con persistencia real', async () => {
    const created = await service.create(validIncident);
    assert.equal(created.status, 'NUEVO');

    await service.assign(created.id, { technicianId: 1, author: 'Jefe TI' });
    await service.changeStatus(created.id, { status: 'EN_PROCESO', author: 'Ana' });
    const final = await service.addComment(created.id, { author: 'Ana', body: 'En revisión' });

    assert.equal(final.status, 'EN_PROCESO');
    assert.ok(final.technicianName);
    assert.deepEqual(
      final.events.map((e) => e.kind),
      ['CREADO', 'ASIGNACION', 'ESTADO', 'ESTADO', 'COMENTARIO'],
    );
    assert.ok(final.createdAt);
  });

  it('filtra con consultas parametrizadas', async () => {
    await service.create({ ...validIncident, category: 'CORREO', priority: 'BAJA' });
    const byCategory = await service.list({ category: 'CORREO' });
    assert.ok(byCategory.length >= 1);
    assert.ok(byCategory.every((i) => i.category === 'CORREO'));

    const injection = await service.list({ technicianId: 1 });
    assert.ok(injection.every((i) => i.technicianId === 1));
  });

  it('el dashboard cuenta incidentes persistidos', async () => {
    const { totals } = await service.dashboard();
    assert.ok(totals.total >= 2);
    assert.equal(totals.total, totals.open + totals.closed);
  });

  it('las restricciones CHECK de la base protegen los datos', async () => {
    await assert.rejects(
      pool.query(
        "INSERT INTO incidents (title, description, category, priority, reporter) VALUES ('abc','12345','MAGIA','ALTA','x')",
      ),
    );
  });
});
