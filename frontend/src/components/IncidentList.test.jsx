import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentList from './IncidentList.jsx';
import { api } from '../api.js';
import { incident, meta, technicians } from '../test/fixtures.js';

vi.mock('../api.js', () => ({ api: { listIncidents: vi.fn() } }));

describe('IncidentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listIncidents.mockResolvedValue([incident]);
  });

  it('lista incidentes y permite abrir el detalle', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<IncidentList meta={meta} technicians={technicians} onSelect={onSelect} />);

    await user.click(await screen.findByRole('button', { name: incident.title }));

    expect(onSelect).toHaveBeenCalledWith(1);
    expect(within(screen.getByRole('table')).getByText('Ana Morales')).toBeInTheDocument();
  });

  it('consulta sin filtros al inicio y con filtros al cambiarlos', async () => {
    const user = userEvent.setup();
    render(<IncidentList meta={meta} technicians={technicians} onSelect={vi.fn()} />);

    await screen.findByText(incident.title);
    expect(api.listIncidents).toHaveBeenLastCalledWith({});

    await user.selectOptions(screen.getByLabelText('Estado'), 'NUEVO');
    await waitFor(() => expect(api.listIncidents).toHaveBeenLastCalledWith({ status: 'NUEVO' }));

    await user.selectOptions(screen.getByLabelText('Técnico'), '2');
    await waitFor(() =>
      expect(api.listIncidents).toHaveBeenLastCalledWith({ status: 'NUEVO', technicianId: '2' }),
    );
  });

  it('informa cuando no hay resultados', async () => {
    api.listIncidents.mockResolvedValue([]);
    render(<IncidentList meta={meta} technicians={technicians} onSelect={vi.fn()} />);
    expect(await screen.findByText('No hay incidentes con esos filtros.')).toBeInTheDocument();
  });
});
