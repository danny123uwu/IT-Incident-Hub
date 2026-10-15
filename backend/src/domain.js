export const STATUSES = ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'];
export const PRIORITIES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
export const CATEGORIES = ['HARDWARE', 'SOFTWARE', 'RED', 'ACCESOS', 'CORREO', 'OTROS'];

// Flujo permitido del estado de un incidente.
export const TRANSITIONS = {
  NUEVO: ['ASIGNADO'],
  ASIGNADO: ['EN_PROCESO'],
  EN_PROCESO: ['RESUELTO', 'ASIGNADO'],
  RESUELTO: ['CERRADO', 'EN_PROCESO'],
  CERRADO: [],
};

// Estados en los que ya debe existir un técnico asignado.
export const REQUIRES_TECHNICIAN = ['ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'];

// Estados en los que todavía se puede (re)asignar un técnico.
export const ASSIGNABLE = ['NUEVO', 'ASIGNADO', 'EN_PROCESO'];

// Mismos técnicos que database/init.sql (usados por el repositorio en memoria).
export const TECHNICIANS_SEED = [
  { name: 'Ana Morales', specialty: 'Redes' },
  { name: 'Luis Pérez', specialty: 'Hardware' },
  { name: 'Carla Gómez', specialty: 'Software' },
  { name: 'Diego Ramírez', specialty: 'Accesos' },
];
