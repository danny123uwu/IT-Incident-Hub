# IT Incident Hub

Sistema web para reportar, asignar y dar seguimiento a incidentes de TI. Todo corre en contenedores.

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 7, servido por nginx |
| API REST | Node 24 + Express 5 |
| Datos | PostgreSQL 18 |
| Pruebas | `node:test` (backend), Vitest + Testing Library (frontend), prueba de humo E2E |
| CI/CD | Azure Pipelines (`azure-pipelines.yml`) y GitHub Actions (`.github/workflows/ci.yml`) |

## Requisitos

Solo **Docker** con Compose v2 (Docker Desktop en Windows/macOS, Docker Engine en Linux). No necesitas Node instalado para ejecutar el sistema ni las pruebas.

## Lanzador

| Acción | Linux / macOS | Windows (PowerShell) | Windows (cmd) |
|---|---|---|---|
| Iniciar | `./devops/incident-hub.sh start` | `.\devops\incident-hub.ps1 start` | `devops\incident-hub.cmd start` |
| Detener (conserva datos) | `... stop` | `... stop` | `... stop` |
| Estado / logs | `... status` / `... logs [servicio]` | igual (`-Service db`) | igual |
| Pruebas en contenedores | `... test` | `... test` | `... test` |
| **Borrar todo** (contenedores, base de datos, imágenes) | `... destroy` (`--yes` omite la confirmación) | `... destroy` (`-Yes`) | `... destroy -Yes` |

Al iniciar por primera vez se crea `.env` con una contraseña aleatoria para PostgreSQL (no se versiona). La aplicación queda en **http://localhost:8080** (cambia `WEB_PORT` en `.env`).

## Estructura

```
backend/      API Express (src/, tests/, Dockerfile)
frontend/     React + Vite (src/, Dockerfile, nginx.conf)
database/     init.sql (esquema + técnicos de ejemplo)
tests/        smoke.mjs (prueba de humo E2E contra el sistema levantado)
devops/       lanzadores y docker-compose.release.yml
docs/         (a completar: arquitectura, branching, deuda técnica, seguridad, dependencias, release)
.github/workflows/ci.yml
azure-pipelines.yml
docker-compose.yml
```

## API

`GET /api/health` · `GET /api/meta` · `GET /api/technicians` · `GET /api/dashboard`
`GET|POST /api/incidents` (filtros: `status`, `priority`, `category`, `technicianId`) · `GET /api/incidents/:id`
`PATCH /api/incidents/:id/assign` · `PATCH /api/incidents/:id/status` · `POST /api/incidents/:id/comments`

Flujo de estados: `NUEVO → ASIGNADO → EN_PROCESO → RESUELTO → CERRADO` (se puede volver de RESUELTO a EN_PROCESO y de EN_PROCESO a ASIGNADO). Para salir de NUEVO hace falta un técnico asignado; asignar desde NUEVO pasa automáticamente a ASIGNADO.

## Desarrollo sin contenedores (opcional, requiere Node ≥ 22)

```bash
cd backend  && npm install && npm run dev      # API en :3000 (en memoria si no hay DATABASE_URL)
cd frontend && npm install && npm run dev      # UI en :5173 con proxy a /api
```

Pruebas locales: `npm test` en cada carpeta. Las pruebas de integración con PostgreSQL se activan con `TEST_DATABASE_URL`; usan un esquema temporal y nunca tocan datos reales.

## Pipelines

- **GitHub Actions**: en cada PR y push a `main` ejecuta lint y pruebas de backend (con PostgreSQL 18), lint/pruebas/build del frontend, `npm audit`, Dependency Review (solo PR) y prueba de humo sobre los contenedores.
- **Azure Pipelines**: etapa *CI* (checkout, instalación, lint, build, pruebas con resultados JUnit, auditoría de dependencias) y etapa *Package* (imágenes, prueba de humo, artefacto con `images.tar.gz`, compose de release y checksums). Usa el pool autohospedado Default (el agente necesita Docker).
- Primera vez: ejecuta `npm install` en `backend/` y `frontend/` y **versiona los `package-lock.json`** para que los pipelines y las imágenes usen `npm ci` (builds reproducibles).

## Responsables

_(Completa con los nombres/usuarios del equipo.)_
