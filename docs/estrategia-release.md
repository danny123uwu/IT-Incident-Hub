# Estrategia de release

> Estado: implementada. El pipeline ejecuta CI, Package, Staging y Production (con aprobación manual) desde la versión 0.4.0; el despliegue a Producción fue validado con el tag v0.4.1.

## Ambientes

| Ambiente | Cómo se despliega | Control |
|---|---|---|
| Desarrollo | `./devops/incident-hub.sh start` en la máquina de cada integrante | Ninguno |
| CI | Cada PR y push: lint, pruebas con PostgreSQL 18, auditoría de dependencias, prueba de humo | El pipeline debe quedar en verde |
| Staging | Automático desde `main` o un tag `vX.Y.Z`, usando el artefacto del pipeline | Prueba de humo automática; base de datos efímera |
| Producción | Solo desde un tag `vX.Y.Z`, después de Staging | **Aprobación manual** en el ambiente `production` |

## Pipeline

```
CI (build, pruebas, seguridad) → Package (imágenes + humo + artefacto) → Staging → [aprobación] → Production
```

El artefacto `incident-hub-release` contiene `images.tar.gz`, `docker-compose.release.yml`, `.env.example`, `database/init.sql`, `smoke.mjs`, `VERSION`, `COMMIT` y `SHA256SUMS`. El mismo artefacto se promueve de Staging a Producción: no se vuelve a compilar.

## Configuración en Azure DevOps

1. **Agente autohospedado** (Project settings → Agent pools → Default → New agent): descargar el agente de Linux, ejecutar `./config.sh` con un PAT de alcance *Agent Pools (read, manage)* y luego `./run.sh` (o instalarlo como servicio con `sudo ./svc.sh install`). El equipo debe tener Docker instalado y el usuario del agente en el grupo `docker`.
2. **Ambientes** (Pipelines → Environments): `staging` y `production`. En `production` abrir *Approvals and checks → Approvals* y agregar uno o más aprobadores.
3. **Variable secreta**: en el pipeline, *Variables → New variable*, nombre `PROD_POSTGRES_PASSWORD`, marcar *Keep this value secret*. Nunca se guarda en el repositorio.

## Cómo liberar una versión

1. Verificar que `main` está en verde.
2. Actualizar la versión en `backend/package.json` y `frontend/package.json`, y el resumen de cambios.
3. Crear el tag: `git tag -a vX.Y.Z -m "Release X.Y.Z" && git push azure vX.Y.Z` (y en el remoto de GitHub).
4. El pipeline despliega a Staging; al terminar, el aprobador valida y aprueba Producción.

## Validaciones en cada etapa

- Staging y Producción ejecutan `smoke.mjs`: salud de la API, conexión a PostgreSQL, creación de un incidente, flujo completo de estados, bitácora, filtros y dashboard.
- El `HEALTHCHECK` de las imágenes hace que `docker compose up --wait` falle si un servicio no arranca.

## Reversión (rollback)

Las imágenes quedan etiquetadas por versión. Para volver a una versión anterior se re-ejecuta el pipeline sobre el tag previo (o `APP_VERSION=<anterior> docker compose -f docker-compose.release.yml up -d`). Los datos se conservan en el volumen `db-data`; `init.sql` es idempotente.
