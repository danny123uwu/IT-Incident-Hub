import { createApp } from '../src/app.js';
import { createMemoryRepository } from '../src/repository/memory.js';

export { validIncident } from './fixtures.js';

export const silentLogger = { error() {}, warn() {}, info() {} };

/** Levanta la API con repositorio en memoria en un puerto efímero. */
export async function startTestServer() {
  const repo = createMemoryRepository({ now: () => new Date('2026-01-01T00:00:00Z') });
  const app = createApp({ repo, logger: silentLogger });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  // body: objeto => JSON; string => cuerpo crudo (para probar JSON inválido)
  async function call(method, path, body) {
    const hasBody = body !== undefined;
    const response = await fetch(baseUrl + path, {
      method,
      headers: hasBody ? { 'content-type': 'application/json' } : {},
      body: hasBody ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  return {
    call,
    repo,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
}
