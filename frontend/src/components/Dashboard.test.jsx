import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard.jsx';
import { api } from '../api.js';

vi.mock('../api.js', () => ({ api: { dashboard: vi.fn() } }));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra abiertos, cerrados, críticos y las distribuciones', async () => {
    api.dashboard.mockResolvedValue({
      totals: { total: 6, open: 4, closed: 2, critical: 1 },
      byCategory: [
        { key: 'RED', count: 3 },
        { key: 'HARDWARE', count: 3 },
      ],
      byTechnician: [
        { key: 'Ana Morales', count: 2 },
        { key: 'Sin asignar', count: 4 },
      ],
    });

    render(<Dashboard />);

    expect(await screen.findByTestId('stat-open')).toHaveTextContent('4');
    expect(screen.getByTestId('stat-closed')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-critical')).toHaveTextContent('1');
    expect(screen.getByText('Ana Morales')).toBeInTheDocument();
    expect(screen.getByText('Sin asignar')).toBeInTheDocument();
  });

  it('muestra el error cuando la API falla', async () => {
    api.dashboard.mockRejectedValue(new Error('API caída'));
    render(<Dashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('API caída');
  });
});
