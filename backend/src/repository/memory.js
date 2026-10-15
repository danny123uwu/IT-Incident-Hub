import { TECHNICIANS_SEED } from '../domain.js';

/**
 * Repositorio en memoria. Se usa en pruebas y cuando no hay DATABASE_URL.
 * Implementa el mismo contrato que repository/pg.js.
 */
export function createMemoryRepository({ now = () => new Date() } = {}) {
  const technicians = TECHNICIANS_SEED.map((tech, index) => ({ id: index + 1, ...tech }));
  const incidents = [];
  const events = [];
  let incidentSeq = 0;
  let eventSeq = 0;
  const stamp = () => now().toISOString();

  return {
    kind: 'memory',

    async ping() {
      return true;
    },

    async listTechnicians() {
      return technicians.map((tech) => ({ ...tech }));
    },

    async getTechnician(id) {
      const tech = technicians.find((t) => t.id === id);
      return tech ? { ...tech } : null;
    },

    async listIncidents(filters = {}) {
      return incidents
        .filter((i) => !filters.status || i.status === filters.status)
        .filter((i) => !filters.priority || i.priority === filters.priority)
        .filter((i) => !filters.category || i.category === filters.category)
        .filter((i) => !filters.technicianId || i.technicianId === filters.technicianId)
        .map((i) => ({ ...i }))
        .sort((a, b) => b.id - a.id);
    },

    async getIncident(id) {
      const incident = incidents.find((i) => i.id === id);
      return incident ? { ...incident } : null;
    },

    async createIncident(data) {
      const timestamp = stamp();
      const incident = {
        id: ++incidentSeq,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        reporter: data.reporter,
        status: data.status,
        technicianId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      incidents.push(incident);
      return { ...incident };
    },

    async updateIncident(id, patch) {
      const incident = incidents.find((i) => i.id === id);
      if (!incident) return null;
      if (patch.status !== undefined) incident.status = patch.status;
      if (patch.technicianId !== undefined) incident.technicianId = patch.technicianId;
      incident.updatedAt = stamp();
      return { ...incident };
    },

    async addEvent(incidentId, { kind, author, message }) {
      const event = { id: ++eventSeq, incidentId, kind, author, message, createdAt: stamp() };
      events.push(event);
      return { ...event };
    },

    async listEvents(incidentId) {
      return events.filter((e) => e.incidentId === incidentId).map((e) => ({ ...e }));
    },
  };
}
