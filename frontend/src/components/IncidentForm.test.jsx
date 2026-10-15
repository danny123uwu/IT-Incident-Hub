import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentForm from './IncidentForm.jsx';
import { api } from '../api.js';
import { incidentDetail, meta } from '../test/fixtures.js';

vi.mock('../api.js', () => ({ api: { createIncident: vi.fn() } }));

describe('IncidentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valida campos obligatorios sin llamar a la API', async () => {
    const user = userEvent.setup();
    render(<IncidentForm meta={meta} onCreated={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Crear incidente' }));

    expect(screen.getByText('El título es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La descripción es obligatoria')).toBeInTheDocument();
    expect(screen.getByText('Indique quién reporta')).toBeInTheDocument();
    expect(api.createIncident).not.toHaveBeenCalled();
  });

  it('envía el incidente y avisa al padre', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    api.createIncident.mockResolvedValue(incidentDetail);
    render(<IncidentForm meta={meta} onCreated={onCreated} />);

    await user.type(screen.getByLabelText('Título'), 'Impresora sin tinta');
    await user.type(screen.getByLabelText('Descripción'), 'No imprime desde ayer');
    await user.selectOptions(screen.getByLabelText('Categoría'), 'RED');
    await user.selectOptions(screen.getByLabelText('Prioridad'), 'ALTA');
    await user.type(screen.getByLabelText('Reportado por'), 'María López');
    await user.click(screen.getByRole('button', { name: 'Crear incidente' }));

    expect(api.createIncident).toHaveBeenCalledWith({
      title: 'Impresora sin tinta',
      description: 'No imprime desde ayer',
      category: 'RED',
      priority: 'ALTA',
      reporter: 'María López',
    });
    expect(onCreated).toHaveBeenCalledWith(incidentDetail);
  });

  it('muestra el error devuelto por el servidor', async () => {
    const user = userEvent.setup();
    const error = new Error('Datos inválidos');
    error.details = { title: 'El título no es válido' };
    api.createIncident.mockRejectedValue(error);
    render(<IncidentForm meta={meta} onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText('Título'), 'Algo');
    await user.type(screen.getByLabelText('Descripción'), 'Descripción larga');
    await user.type(screen.getByLabelText('Reportado por'), 'Pedro');
    await user.click(screen.getByRole('button', { name: 'Crear incidente' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El título no es válido');
  });
});
