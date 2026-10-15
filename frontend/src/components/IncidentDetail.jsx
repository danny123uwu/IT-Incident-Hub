import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { describeError, formatDate, label } from '../format.js';

const ASSIGNABLE = ['NUEVO', 'ASIGNADO', 'EN_PROCESO'];

export default function IncidentDetail({ id, meta, technicians, currentUser, onBack }) {
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [techChoice, setTechChoice] = useState('');
  const [comment, setComment] = useState('');

  const load = useCallback(() => {
    api
      .getIncident(id)
      .then(setIncident)
      .catch((err) => setError(describeError(err)));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action, onSuccess) {
    setBusy(true);
    setError('');
    try {
      setIncident(await action());
      onSuccess?.();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!incident) {
    return error ? (
      <p role="alert" className="error">
        {error}
      </p>
    ) : (
      <p>Cargando…</p>
    );
  }

  const selectedTech = techChoice || String(incident.technicianId ?? '');
  const nextStates = meta.transitions[incident.status] ?? [];
  const canAssign = ASSIGNABLE.includes(incident.status);

  return (
    <article className="card">
      <button type="button" className="link" onClick={onBack}>
        ← Volver a la lista
      </button>

      <h2>
        #{incident.id} {incident.title}
      </h2>
      <p className="muted">
        {label(incident.category)} · Prioridad {label(incident.priority)} · Estado{' '}
        <span className="badge">{label(incident.status)}</span> · Reportó {incident.reporter} ·{' '}
        {formatDate(incident.createdAt)}
      </p>
      <p>{incident.description}</p>
      <p>
        <strong>Técnico:</strong> {incident.technicianName ?? 'Sin asignar'}
      </p>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {canAssign && (
        <div className="row action">
          <div className="field">
            <label htmlFor="d-tech">Técnico</label>
            <select id="d-tech" value={selectedTech} onChange={(event) => setTechChoice(event.target.value)}>
              <option value="">Seleccione…</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={busy || !selectedTech}
            onClick={() =>
              run(
                () => api.assign(incident.id, { technicianId: Number(selectedTech), author: currentUser }),
                () => setTechChoice(''),
              )
            }
          >
            Asignar
          </button>
        </div>
      )}

      {nextStates.length > 0 && (
        <div className="row action">
          {nextStates.map((next) => (
            <button
              key={next}
              type="button"
              disabled={busy}
              onClick={() => run(() => api.changeStatus(incident.id, { status: next, author: currentUser }))}
            >
              Mover a {label(next)}
            </button>
          ))}
        </div>
      )}

      <h3>Bitácora</h3>
      <ul className="timeline">
        {incident.events.map((event) => (
          <li key={event.id}>
            <span className="muted">
              {formatDate(event.createdAt)} · {event.author} · {label(event.kind)}
            </span>
            <div>{event.message}</div>
          </li>
        ))}
      </ul>

      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!comment.trim()) return;
          run(
            () => api.addComment(incident.id, { author: currentUser, body: comment.trim() }),
            () => setComment(''),
          );
        }}
      >
        <div className="field">
          <label htmlFor="d-comment">Comentario</label>
          <textarea id="d-comment" rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
        </div>
        <button type="submit" className="primary" disabled={busy || !comment.trim()}>
          Agregar comentario
        </button>
      </form>
    </article>
  );
}
