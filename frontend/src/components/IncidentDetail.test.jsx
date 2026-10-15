import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentDetail from './IncidentDetail.jsx';
import { api } from '../api.js';
import { incidentDetail, meta, technicians } from '../test/fixtures.js';

vi.mock('../api.js', () => ({
  api: { getIncident: vi.fn(), assign: vi.fn(), changeStatus: vi.fn(), addComment: vi.fn() },
}));

const props = { id: 1, meta, technicians, currentUser: 'Operador TI', onBack: vi.fn() };

describe('IncidentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getIncident.mockResolvedValue(incidentDetail);
  });

  it('muestra el incidente y su bitácora', async () => {
    render(<IncidentDetail {...props} />);

    expect(await screen.findByText(/Sin internet en contabilidad/)).toBeInTheDocument();
    expect(screen.getByText('Incidente creado')).toBeInTheDocument();
    expect(screen.getByText('Asignado a Ana Morales')).toBeInTheDocument();
  });

  it('agrega un comentario con el usuario actual', async () => {
    const user = userEvent.setup();
    api.addComment.mockResolvedValue({
      ...incidentDetail,
      events: [
        ...incidentDetail.events,
        { id: 3, kind: 'COMENTARIO', author: 'Operador TI', message: 'Revisando el switch', createdAt: '2026-01-01T11:00:00.000Z' },
      ],
    });
    render(<IncidentDetail {...props} />);

    await user.type(await screen.findByLabelText('Comentario'), 'Revisando el switch');
    await user.click(screen.getByRole('button', { name: 'Agregar comentario' }));

    expect(api.addComment).toHaveBeenCalledWith(1, { author: 'Operador TI', body: 'Revisando el switch' });
    expect(await screen.findByText('Revisando el switch')).toBeInTheDocument();
  });

  it('cambia el estado con las transiciones permitidas', async () => {
    const user = userEvent.setup();
    api.changeStatus.mockResolvedValue({ ...incidentDetail, status: 'EN_PROCESO' });
    render(<IncidentDetail {...props} />);

    await user.click(await screen.findByRole('button', { name: 'Mover a EN PROCESO' }));

    expect(api.changeStatus).toHaveBeenCalledWith(1, { status: 'EN_PROCESO', author: 'Operador TI' });
  });

  it('reasigna el técnico', async () => {
    const user = userEvent.setup();
    api.assign.mockResolvedValue({ ...incidentDetail, technicianId: 2, technicianName: 'Luis Pérez' });
    render(<IncidentDetail {...props} />);

    await user.selectOptions(await screen.findByLabelText('Técnico'), '2');
    await user.click(screen.getByRole('button', { name: 'Asignar' }));

    expect(api.assign).toHaveBeenCalledWith(1, { technicianId: 2, author: 'Operador TI' });
  });

  it('muestra el error de negocio devuelto por la API', async () => {
    const user = userEvent.setup();
    api.changeStatus.mockRejectedValue(new Error('Transición no permitida'));
    render(<IncidentDetail {...props} />);

    await user.click(await screen.findByRole('button', { name: 'Mover a EN PROCESO' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Transición no permitida');
  });
});
