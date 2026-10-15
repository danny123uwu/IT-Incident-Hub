export const meta = {
  statuses: ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'],
  priorities: ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'],
  categories: ['HARDWARE', 'SOFTWARE', 'RED', 'ACCESOS', 'CORREO', 'OTROS'],
  transitions: {
    NUEVO: ['ASIGNADO'],
    ASIGNADO: ['EN_PROCESO'],
    EN_PROCESO: ['RESUELTO', 'ASIGNADO'],
    RESUELTO: ['CERRADO', 'EN_PROCESO'],
    CERRADO: [],
  },
};

export const technicians = [
  { id: 1, name: 'Ana Morales', specialty: 'Redes' },
  { id: 2, name: 'Luis Pérez', specialty: 'Hardware' },
];

export const incident = {
  id: 1,
  title: 'Sin internet en contabilidad',
  description: 'No hay conexión desde la mañana.',
  category: 'RED',
  priority: 'ALTA',
  reporter: 'María López',
  status: 'ASIGNADO',
  technicianId: 1,
  technicianName: 'Ana Morales',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

export const incidentDetail = {
  ...incident,
  events: [
    { id: 1, kind: 'CREADO', author: 'María López', message: 'Incidente creado', createdAt: '2026-01-01T10:00:00.000Z' },
    { id: 2, kind: 'ASIGNACION', author: 'Jefe TI', message: 'Asignado a Ana Morales', createdAt: '2026-01-01T10:05:00.000Z' },
  ],
};
