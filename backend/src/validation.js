import { CATEGORIES, PRIORITIES, STATUSES } from './domain.js';
import { HttpError } from './errors.js';

const MAX_INT4 = 2147483647;

const asObject = (body) => (body && typeof body === 'object' && !Array.isArray(body) ? body : {});
const clean = (value) => (typeof value === 'string' ? value.trim() : '');

function checkText(errors, field, value, label, min, max) {
  const text = clean(value);
  if (text.length < min) {
    errors[field] = min === 1 ? `${label} es obligatorio` : `${label} debe tener al menos ${min} caracteres`;
  } else if (text.length > max) {
    errors[field] = `${label} no puede superar ${max} caracteres`;
  }
  return text;
}

function checkEnum(errors, field, value, allowed, label) {
  if (!allowed.includes(value)) {
    errors[field] = `${label} inválido. Valores permitidos: ${allowed.join(', ')}`;
  }
  return value;
}

function failIfErrors(errors) {
  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, 'Datos inválidos', errors);
  }
}

export function parseId(value, label = 'Identificador') {
  const text = String(value ?? '');
  if (!/^[1-9]\d{0,9}$/.test(text) || Number(text) > MAX_INT4) {
    throw new HttpError(400, `${label} inválido`);
  }
  return Number(text);
}

export function validateNewIncident(body) {
  const input = asObject(body);
  const errors = {};
  const data = {
    title: checkText(errors, 'title', input.title, 'El título', 3, 120),
    description: checkText(errors, 'description', input.description, 'La descripción', 5, 4000),
    category: checkEnum(errors, 'category', input.category, CATEGORIES, 'Categoría'),
    priority: checkEnum(errors, 'priority', input.priority, PRIORITIES, 'Prioridad'),
    reporter: checkText(errors, 'reporter', input.reporter, 'El usuario que reporta', 2, 80),
  };
  failIfErrors(errors);
  return data;
}

export function validateComment(body) {
  const input = asObject(body);
  const errors = {};
  const data = {
    author: checkText(errors, 'author', input.author, 'El autor', 2, 80),
    body: checkText(errors, 'body', input.body, 'El comentario', 1, 2000),
  };
  failIfErrors(errors);
  return data;
}

function optionalAuthor(errors, value) {
  if (value === undefined || value === null || value === '') return 'Sistema';
  return checkText(errors, 'author', value, 'El autor', 2, 80);
}

export function validateStatusChange(body) {
  const input = asObject(body);
  const errors = {};
  const status = checkEnum(errors, 'status', input.status, STATUSES, 'Estado');
  const author = optionalAuthor(errors, input.author);
  failIfErrors(errors);
  return { status, author };
}

export function validateAssignment(body) {
  const input = asObject(body);
  const errors = {};
  let technicianId;
  try {
    technicianId = parseId(input.technicianId, 'Técnico');
  } catch {
    errors.technicianId = 'Técnico inválido';
  }
  const author = optionalAuthor(errors, input.author);
  failIfErrors(errors);
  return { technicianId, author };
}

export function parseFilters(query) {
  const input = asObject(query);
  const errors = {};
  const filters = {};

  const enumFilters = [
    ['status', STATUSES, 'Estado'],
    ['priority', PRIORITIES, 'Prioridad'],
    ['category', CATEGORIES, 'Categoría'],
  ];
  for (const [field, allowed, label] of enumFilters) {
    const value = input[field];
    if (value === undefined || value === '') continue;
    checkEnum(errors, field, value, allowed, label);
    filters[field] = value;
  }

  if (input.technicianId !== undefined && input.technicianId !== '') {
    try {
      filters.technicianId = parseId(input.technicianId, 'Técnico');
    } catch {
      errors.technicianId = 'Técnico inválido';
    }
  }

  failIfErrors(errors);
  return filters;
}
