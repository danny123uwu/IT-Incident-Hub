import {
  ASSIGNABLE,
  CATEGORIES,
  PRIORITIES,
  REQUIRES_TECHNICIAN,
  STATUSES,
  TRANSITIONS,
} from './domain.js';
import { HttpError } from './errors.js';
import {
  parseFilters,
  parseId,
  validateAssignment,
  validateComment,
  validateNewIncident,
  validateStatusChange,
} from './validation.js';

export function createIncidentService(repo) {
  const technicianNames = async () =>
    new Map((await repo.listTechnicians()).map((tech) => [tech.id, tech.name]));

  const present = (incident, names) => ({
    ...incident,
    technicianName: incident.technicianId ? (names.get(incident.technicianId) ?? null) : null,
  });

  async function load(id) {
    const incident = await repo.getIncident(id);
    if (!incident) throw new HttpError(404, 'Incidente no encontrado');
    return incident;
  }

  async function detail(id) {
    const [incident, events, names] = await Promise.all([
      load(id),
      repo.listEvents(id),
      technicianNames(),
    ]);
    return { ...present(incident, names), events };
  }

  return {
    meta() {
      return {
        statuses: STATUSES,
        priorities: PRIORITIES,
        categories: CATEGORIES,
        transitions: TRANSITIONS,
      };
    },

    technicians() {
      return repo.listTechnicians();
    },

    async list(query) {
      const filters = parseFilters(query);
      const [incidents, names] = await Promise.all([repo.listIncidents(filters), technicianNames()]);
      return incidents.map((incident) => present(incident, names));
    },

    async get(rawId) {
      return detail(parseId(rawId));
    },

    async create(body) {
      const data = validateNewIncident(body);
      const incident = await repo.createIncident({ ...data, status: 'NUEVO' });
      await repo.addEvent(incident.id, {
        kind: 'CREADO',
        author: data.reporter,
        message: 'Incidente creado',
      });
      return detail(incident.id);
    },

    async assign(rawId, body) {
      const id = parseId(rawId);
      const { technicianId, author } = validateAssignment(body);
      const incident = await load(id);

      if (!ASSIGNABLE.includes(incident.status)) {
        throw new HttpError(409, `No se puede asignar un incidente en estado ${incident.status}`);
      }
      const technician = await repo.getTechnician(technicianId);
      if (!technician) throw new HttpError(404, 'Técnico no encontrado');

      const patch = { technicianId };
      if (incident.status === 'NUEVO') patch.status = 'ASIGNADO';

      await repo.updateIncident(id, patch);
      await repo.addEvent(id, {
        kind: 'ASIGNACION',
        author,
        message: `Asignado a ${technician.name}`,
      });
      if (patch.status) {
        await repo.addEvent(id, { kind: 'ESTADO', author, message: 'Estado: NUEVO → ASIGNADO' });
      }
      return detail(id);
    },

    async changeStatus(rawId, body) {
      const id = parseId(rawId);
      const { status, author } = validateStatusChange(body);
      const incident = await load(id);

      if (status === incident.status) {
        throw new HttpError(409, `El incidente ya está en estado ${status}`);
      }
      if (!TRANSITIONS[incident.status].includes(status)) {
        throw new HttpError(409, `Transición no permitida: ${incident.status} → ${status}`);
      }
      if (REQUIRES_TECHNICIAN.includes(status) && !incident.technicianId) {
        throw new HttpError(409, 'Asigne un técnico antes de cambiar el estado');
      }

      await repo.updateIncident(id, { status });
      await repo.addEvent(id, {
        kind: 'ESTADO',
        author,
        message: `Estado: ${incident.status} → ${status}`,
      });
      return detail(id);
    },

    async addComment(rawId, body) {
      const id = parseId(rawId);
      const { author, body: text } = validateComment(body);
      await load(id);
      await repo.addEvent(id, { kind: 'COMENTARIO', author, message: text });
      return detail(id);
    },

    async dashboard() {
      const [incidents, technicians] = await Promise.all([
        repo.listIncidents({}),
        repo.listTechnicians(),
      ]);

      const totals = {
        total: incidents.length,
        open: incidents.filter((i) => i.status !== 'CERRADO').length,
        closed: incidents.filter((i) => i.status === 'CERRADO').length,
        critical: incidents.filter((i) => i.priority === 'CRITICA' && i.status !== 'CERRADO').length,
      };

      const byCategory = CATEGORIES.map((key) => ({
        key,
        count: incidents.filter((i) => i.category === key).length,
      }));

      const byTechnician = [
        ...technicians.map((tech) => ({
          key: tech.name,
          count: incidents.filter((i) => i.technicianId === tech.id).length,
        })),
        { key: 'Sin asignar', count: incidents.filter((i) => !i.technicianId).length },
      ];

      return { totals, byCategory, byTechnician };
    },
  };
}
