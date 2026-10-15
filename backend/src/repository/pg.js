const INCIDENT_COLUMNS =
  'id, title, description, category, priority, reporter, status, technician_id, created_at, updated_at';

const iso = (value) => (value instanceof Date ? value.toISOString() : value);

const mapIncident = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category,
  priority: row.priority,
  reporter: row.reporter,
  status: row.status,
  technicianId: row.technician_id,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

const mapEvent = (row) => ({
  id: row.id,
  incidentId: row.incident_id,
  kind: row.kind,
  author: row.author,
  message: row.message,
  createdAt: iso(row.created_at),
});

/**
 * Repositorio PostgreSQL. Todas las consultas están parametrizadas.
 * Recibe un pg.Pool ya creado para poder reutilizarlo en pruebas.
 */
export function createPgRepository(pool) {
  return {
    kind: 'postgres',

    async ping() {
      await pool.query('SELECT 1');
      return true;
    },

    async listTechnicians() {
      const { rows } = await pool.query('SELECT id, name, specialty FROM technicians ORDER BY id');
      return rows;
    },

    async getTechnician(id) {
      const { rows } = await pool.query('SELECT id, name, specialty FROM technicians WHERE id = $1', [id]);
      return rows[0] ?? null;
    },

    async listIncidents(filters = {}) {
      const where = [];
      const values = [];
      const add = (column, value) => {
        values.push(value);
        where.push(`${column} = $${values.length}`);
      };
      if (filters.status) add('status', filters.status);
      if (filters.priority) add('priority', filters.priority);
      if (filters.category) add('category', filters.category);
      if (filters.technicianId) add('technician_id', filters.technicianId);

      const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
      const { rows } = await pool.query(
        `SELECT ${INCIDENT_COLUMNS} FROM incidents ${clause} ORDER BY created_at DESC, id DESC`,
        values,
      );
      return rows.map(mapIncident);
    },

    async getIncident(id) {
      const { rows } = await pool.query(`SELECT ${INCIDENT_COLUMNS} FROM incidents WHERE id = $1`, [id]);
      return rows[0] ? mapIncident(rows[0]) : null;
    },

    async createIncident(data) {
      const { rows } = await pool.query(
        `INSERT INTO incidents (title, description, category, priority, reporter, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${INCIDENT_COLUMNS}`,
        [data.title, data.description, data.category, data.priority, data.reporter, data.status],
      );
      return mapIncident(rows[0]);
    },

    async updateIncident(id, patch) {
      const sets = [];
      const values = [];
      const add = (column, value) => {
        values.push(value);
        sets.push(`${column} = $${values.length}`);
      };
      if (patch.status !== undefined) add('status', patch.status);
      if (patch.technicianId !== undefined) add('technician_id', patch.technicianId);
      sets.push('updated_at = now()');

      values.push(id);
      const { rows } = await pool.query(
        `UPDATE incidents SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING ${INCIDENT_COLUMNS}`,
        values,
      );
      return rows[0] ? mapIncident(rows[0]) : null;
    },

    async addEvent(incidentId, { kind, author, message }) {
      const { rows } = await pool.query(
        `INSERT INTO incident_events (incident_id, kind, author, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id, incident_id, kind, author, message, created_at`,
        [incidentId, kind, author, message],
      );
      return mapEvent(rows[0]);
    },

    async listEvents(incidentId) {
      const { rows } = await pool.query(
        `SELECT id, incident_id, kind, author, message, created_at
           FROM incident_events WHERE incident_id = $1 ORDER BY created_at ASC, id ASC`,
        [incidentId],
      );
      return rows.map(mapEvent);
    },
  };
}
