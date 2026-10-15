import { useState } from 'react';
import { api } from '../api.js';
import { describeError, label } from '../format.js';

function validate(form) {
  const errors = {};
  if (form.title.trim().length < 3) errors.title = 'El título es obligatorio';
  if (form.description.trim().length < 5) errors.description = 'La descripción es obligatoria';
  if (form.reporter.trim().length < 2) errors.reporter = 'Indique quién reporta';
  return errors;
}

export default function IncidentForm({ meta, currentUser = '', onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: meta.categories[0],
    priority: meta.priorities.includes('MEDIA') ? 'MEDIA' : meta.priorities[0],
    reporter: currentUser,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    setServerError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const created = await api.createIncident({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        reporter: form.reporter.trim(),
      });
      onCreated(created);
    } catch (error) {
      setServerError(describeError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2>Nuevo incidente</h2>

      <div className="field">
        <label htmlFor="f-title">Título</label>
        <input id="f-title" value={form.title} onChange={update('title')} maxLength={120} />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </div>

      <div className="field">
        <label htmlFor="f-description">Descripción</label>
        <textarea id="f-description" rows={4} value={form.description} onChange={update('description')} />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="f-category">Categoría</label>
          <select id="f-category" value={form.category} onChange={update('category')}>
            {meta.categories.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-priority">Prioridad</label>
          <select id="f-priority" value={form.priority} onChange={update('priority')}>
            {meta.priorities.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-reporter">Reportado por</label>
        <input id="f-reporter" value={form.reporter} onChange={update('reporter')} />
        {errors.reporter && <span className="field-error">{errors.reporter}</span>}
      </div>

      {serverError && (
        <p role="alert" className="error">
          {serverError}
        </p>
      )}

      <button type="submit" className="primary" disabled={submitting}>
        Crear incidente
      </button>
    </form>
  );
}
