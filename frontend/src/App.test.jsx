import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { api } from './api.js';
import { meta, technicians } from './test/fixtures.js';

vi.mock('./api.js', () => ({
  api: { meta: vi.fn(), technicians: vi.fn(), dashboard: vi.fn(), listIncidents: vi.fn() },
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.meta.mockResolvedValue(meta);
    api.technicians.mockResolvedValue(technicians);
    api.dashboard.mockResolvedValue({
      totals: { total: 0, open: 0, closed: 0, critical: 0 },
      byCategory: [],
      byTechnician: [],
    });
    api.listIncidents.mockResolvedValue([]);
  });

  it('carga el panel y navega entre vistas', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'IT Incident Hub' })).toBeInTheDocument();
    expect(await screen.findByTestId('stat-open')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nuevo incidente' }));
    expect(await screen.findByRole('button', { name: 'Crear incidente' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Incidentes' }));
    expect(await screen.findByText('No hay incidentes con esos filtros.')).toBeInTheDocument();
  });

  it('avisa cuando no hay conexión con la API', async () => {
    api.meta.mockRejectedValue(new Error('Failed to fetch'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con la API');
  });
});
