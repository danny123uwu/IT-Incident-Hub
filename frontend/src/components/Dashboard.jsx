import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { label } from '../format.js';

function BarList({ title, rows }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="card">
      <h2>{title}</h2>
      <ul className="bars">
        {rows.map((row) => (
          <li key={row.key}>
            <span className="bar-label">{label(row.key)}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(row.count / max) * 100}%` }} />
            </span>
            <span className="bar-count">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .dashboard()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <p role="alert" className="error">
        {error}
      </p>
    );
  }
  if (!data) return <p>Cargando indicadores…</p>;

  const stats = [
    { id: 'open', text: 'Abiertos', value: data.totals.open },
    { id: 'closed', text: 'Cerrados', value: data.totals.closed },
    { id: 'critical', text: 'Críticos', value: data.totals.critical },
    { id: 'total', text: 'Total', value: data.totals.total },
  ];

  return (
    <div>
      <div className="stats">
        {stats.map((stat) => (
          <div key={stat.id} className="card stat">
            <span className="stat-label">{stat.text}</span>
            <strong data-testid={`stat-${stat.id}`}>{stat.value}</strong>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <BarList title="Por categoría" rows={data.byCategory} />
        <BarList title="Por técnico" rows={data.byTechnician} />
      </div>
    </div>
  );
}
