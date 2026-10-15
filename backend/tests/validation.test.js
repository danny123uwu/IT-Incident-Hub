import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from '../src/errors.js';
import {
  parseFilters,
  parseId,
  validateAssignment,
  validateComment,
  validateNewIncident,
  validateStatusChange,
} from '../src/validation.js';
import { validIncident } from './fixtures.js';

function details(fn) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof HttpError);
    assert.equal(error.status, 400);
    return error.details ?? {};
  }
  assert.fail('Se esperaba un HttpError');
}

describe('validateNewIncident', () => {
  it('acepta datos válidos y recorta espacios', () => {
    const result = validateNewIncident({ ...validIncident, title: '  Sin red en bodega  ' });
    assert.equal(result.title, 'Sin red en bodega');
    assert.equal(result.priority, 'ALTA');
  });

  it('reporta todos los campos inválidos a la vez', () => {
    const errors = details(() => validateNewIncident({}));
    assert.deepEqual(Object.keys(errors).sort(), [
      'category',
      'description',
      'priority',
      'reporter',
      'title',
    ]);
  });

  it('rechaza categoría y prioridad fuera de catálogo', () => {
    const errors = details(() =>
      validateNewIncident({ ...validIncident, category: 'MAGIA', priority: 'URGENTE' }),
    );
    assert.ok(errors.category);
    assert.ok(errors.priority);
  });

  it('rechaza títulos demasiado largos', () => {
    const errors = details(() => validateNewIncident({ ...validIncident, title: 'x'.repeat(121) }));
    assert.ok(errors.title);
  });

  it('tolera cuerpos que no son objetos', () => {
    assert.throws(() => validateNewIncident(null), HttpError);
    assert.throws(() => validateNewIncident([]), HttpError);
  });
});

describe('validateComment / validateStatusChange / validateAssignment', () => {
  it('comentario requiere autor y texto', () => {
    const errors = details(() => validateComment({ author: '', body: '   ' }));
    assert.ok(errors.author);
    assert.ok(errors.body);
    assert.deepEqual(validateComment({ author: 'Ana', body: ' hola ' }), { author: 'Ana', body: 'hola' });
  });

  it('cambio de estado valida el catálogo y usa autor por defecto', () => {
    assert.deepEqual(validateStatusChange({ status: 'RESUELTO' }), {
      status: 'RESUELTO',
      author: 'Sistema',
    });
    assert.ok(details(() => validateStatusChange({ status: 'HECHO' })).status);
  });

  it('asignación requiere un técnico numérico positivo', () => {
    assert.deepEqual(validateAssignment({ technicianId: 2, author: 'Jefe' }), {
      technicianId: 2,
      author: 'Jefe',
    });
    assert.ok(details(() => validateAssignment({ technicianId: 'abc' })).technicianId);
    assert.ok(details(() => validateAssignment({ technicianId: 0 })).technicianId);
  });
});

describe('parseId', () => {
  it('acepta enteros positivos', () => {
    assert.equal(parseId('42'), 42);
  });

  it('rechaza valores no válidos', () => {
    for (const value of ['0', '-1', '1.5', 'abc', '', undefined, '99999999999']) {
      assert.throws(() => parseId(value), HttpError, `debería rechazar ${value}`);
    }
  });
});

describe('parseFilters', () => {
  it('ignora filtros vacíos y convierte technicianId', () => {
    assert.deepEqual(parseFilters({ status: '', priority: 'ALTA', technicianId: '3' }), {
      priority: 'ALTA',
      technicianId: 3,
    });
  });

  it('rechaza valores desconocidos', () => {
    const errors = details(() => parseFilters({ status: 'X', technicianId: 'y' }));
    assert.ok(errors.status);
    assert.ok(errors.technicianId);
  });
});
