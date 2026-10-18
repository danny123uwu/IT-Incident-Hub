# Deuda técnica

Registro de deudas identificadas en el proyecto. Cada una se registra como Work Item en Azure Boards con la etiqueta `deuda-tecnica`; las resueltas se cierran mediante una rama y un Pull Request.

| # | Deuda | Impacto | Estado | Resolución |
|---|---|---|---|---|
| D1 | El pipeline de Azure tenía un parámetro `agentPool` que ya no se usaba tras fijar el pool `Default` | Configuración que no refleja la realidad y confunde a quien la lee | **Resuelta** | PR 4, rama `refactor/limpiar-parametro-agentpool`: se eliminó el parámetro y se actualizó el README |
| D2 | La constante de estados "asignables" está duplicada en backend y frontend | Cambiar una regla obliga a editar dos sitios y puede desincronizarlos | Pendiente | Publicarla en `/api/meta` y que el frontend la consuma |
| D3 | Workflow de GitHub Actions con acciones en versiones que usan Node 20 (deprecado) | Advertencias hoy y fallos cuando GitHub retire Node 20 | Pendiente | Actualizar `checkout`, `setup-node` y `upload-artifact` a v5 |
| D4 | Dependencias del frontend con vulnerabilidades reportadas por `npm audit` | Riesgo en la cadena de herramientas y ruido en la auditoría | **Resuelta** | PR 10, rama `fix/dependencias-frontend`: Vitest y `@vitest/coverage-v8` actualizados a v5; `npm audit` queda en 0 vulnerabilidades (ver `dependencias.md`) |
| D5 | El pipeline de Azure usa la tarea `NodeTool@0`, marcada como obsoleta | Advertencias en cada ejecución y posible retiro futuro | Pendiente | Migrar a `UseNode@1` |
| D6 | El esquema solo existe en `init.sql`, que se ejecuta al crear el volumen; no hay migraciones versionadas | Cambiar el esquema en una base existente exige intervención manual | Pendiente | Adoptar una herramienta de migraciones (p. ej. node-pg-migrate) |
| D7 | La API no tiene autenticación y el autor de cada acción lo envía el cliente | Cualquiera puede suplantar a otro usuario | Pendiente | Autenticación (OIDC/JWT) y autor tomado del token |
| D8 | `GET /api/incidents` devuelve todos los registros sin paginación | Degradación con miles de incidentes | Pendiente | Paginación por cursor con `limit` |
| D9 | No hay pruebas de interfaz extremo a extremo en navegador | Los fallos de integración visual solo se ven manualmente | Pendiente | Playwright sobre el entorno de Compose |

## Cómo se gestiona

1. Se registra como Work Item con la etiqueta `deuda-tecnica`.
2. Se resuelve en una rama `refactor/*` o `fix/*` con commits `AB#id`.
3. El Pull Request incluye la evidencia de pruebas en verde.
4. Se actualiza esta tabla al cerrar el Work Item.
