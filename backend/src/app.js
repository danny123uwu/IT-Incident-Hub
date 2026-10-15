import express from 'express';
import helmet from 'helmet';
import { HttpError } from './errors.js';
import { createIncidentService } from './service.js';

export function createApp({ repo, logger = console }) {
  const service = createIncidentService(repo);
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();

  api.get('/health', async (_req, res) => {
    try {
      await repo.ping();
      res.json({ status: 'ok', storage: repo.kind });
    } catch {
      res.status(503).json({ status: 'error', storage: repo.kind });
    }
  });

  api.get('/meta', (_req, res) => res.json(service.meta()));
  api.get('/technicians', async (_req, res) => res.json(await service.technicians()));
  api.get('/dashboard', async (_req, res) => res.json(await service.dashboard()));

  api.get('/incidents', async (req, res) => res.json(await service.list(req.query)));
  api.post('/incidents', async (req, res) => res.status(201).json(await service.create(req.body)));
  api.get('/incidents/:id', async (req, res) => res.json(await service.get(req.params.id)));
  api.patch('/incidents/:id/assign', async (req, res) =>
    res.json(await service.assign(req.params.id, req.body)),
  );
  api.patch('/incidents/:id/status', async (req, res) =>
    res.json(await service.changeStatus(req.params.id, req.body)),
  );
  api.post('/incidents/:id/comments', async (req, res) =>
    res.status(201).json(await service.addComment(req.params.id, req.body)),
  );

  api.use(() => {
    throw new HttpError(404, 'Ruta no encontrada');
  });

  app.use('/api', api);

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, details: err.details });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON inválido' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Solicitud demasiado grande' });
    }
    logger.error(err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
