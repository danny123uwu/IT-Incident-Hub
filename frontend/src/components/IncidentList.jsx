import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate, label } from '../format.js';

function Filter({ id, text, value, onChange, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{text}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {children}
      </select>
    </div>
  );
}

export default function IncidentList({ meta, technicians, onSelect }) {
  const [filters, setFilters] = useState({ status: '', priority: '', category: '', technicianId: '' });
  const [incidents, setIncidents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    api
      .listIncidents(params)
      .then((result) => {
        if (!active) return;
        setIncidents(result);
        setError('');
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [filters]);

  const setFilter = (field) => (value) => setFilters((current) => ({ ...current, [field]: value }));
  const options = (values) =>
    values.map((value) => (
      <option key={value} value={value}>
        {label(value)}
      </option>
    ));

  return (
    <section className="card">
      <h2>Incidentes</h2>

      <div className="filters">
        <Filter id="flt-status" text="Estado" value={filters.status} onChange={setFilter('status')}>
          {options(meta.statuses)}
        </Filter>
        <Filter id="flt-priority" text="Prioridad" value={filters.priority} onChange={setFilter('priority')}>
          {options(meta.priorities)}
        </Filter>
        <Filter id="flt-category" text="Categoría" value={filters.category} onChange={setFilter('category')}>
          {options(meta.categories)}
        </Filter>
        <Filter
          id="flt-technician"
          text="Técnico"
          value={filters.technicianId}
          onChange={setFilter('technicianId')}
        >
          {technicians.map((tech) => (
            <option key={tech.id} value={tech.id}>
              {tech.name}
            </option>
          ))}
        </Filter>
      </div>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!incidents && !error && <p>Cargando…</p>}
      {incidents && incidents.length === 0 && <p>No hay incidentes con esos filtros.</p>}

      {incidents && incidents.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Título</th>
              <th>Categoría</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Técnico</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr key={incident.id}>
                <td>{incident.id}</td>
                <td>
                  <button type="button" className="link" onClick={() => onSelect(incident.id)}>
                    {incident.title}
                  </button>
                </td>
                <td>{label(incident.category)}</td>
                <td>
                  <span className={`badge prio-${incident.priority}`}>{label(incident.priority)}</span>
                </td>
                <td>
                  <span className="badge">{label(incident.status)}</span>
                </td>
                <td>{incident.technicianName ?? '—'}</td>
                <td>{formatDate(incident.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
