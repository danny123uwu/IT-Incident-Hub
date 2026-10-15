import { useEffect, useState } from 'react';
import { api } from './api.js';
import Dashboard from './components/Dashboard.jsx';
import IncidentDetail from './components/IncidentDetail.jsx';
import IncidentForm from './components/IncidentForm.jsx';
import IncidentList from './components/IncidentList.jsx';

const VIEWS = [
  { id: 'dashboard', text: 'Panel' },
  { id: 'incidents', text: 'Incidentes' },
  { id: 'new', text: 'Nuevo incidente' },
];

export default function App() {
  const [meta, setMeta] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [error, setError] = useState('');
  const [view, setView] = useState('dashboard');
  const [selectedId, setSelectedId] = useState(null);
  const [currentUser, setCurrentUser] = useState('Operador TI');

  useEffect(() => {
    let active = true;
    Promise.all([api.meta(), api.technicians()])
      .then(([loadedMeta, loadedTechnicians]) => {
        if (!active) return;
        setMeta(loadedMeta);
        setTechnicians(loadedTechnicians);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const goTo = (next) => {
    setView(next);
    setSelectedId(null);
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>IT Incident Hub</h1>
        <nav aria-label="Navegación principal">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? 'nav active' : 'nav'}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => goTo(item.id)}
            >
              {item.text}
            </button>
          ))}
        </nav>
        <div className="user">
          <label htmlFor="current-user">Usuario</label>
          <input
            id="current-user"
            value={currentUser}
            onChange={(event) => setCurrentUser(event.target.value)}
          />
        </div>
      </header>

      <main>
        {error && (
          <p role="alert" className="error">
            No se pudo conectar con la API: {error}
          </p>
        )}
        {!meta && !error && <p>Cargando…</p>}

        {meta && view === 'dashboard' && <Dashboard />}

        {meta && view === 'incidents' && selectedId === null && (
          <IncidentList meta={meta} technicians={technicians} onSelect={setSelectedId} />
        )}

        {meta && view === 'incidents' && selectedId !== null && (
          <IncidentDetail
            id={selectedId}
            meta={meta}
            technicians={technicians}
            currentUser={currentUser}
            onBack={() => setSelectedId(null)}
          />
        )}

        {meta && view === 'new' && (
          <IncidentForm
            meta={meta}
            currentUser={currentUser}
            onCreated={(incident) => {
              setView('incidents');
              setSelectedId(incident.id);
            }}
          />
        )}
      </main>
    </div>
  );
}
