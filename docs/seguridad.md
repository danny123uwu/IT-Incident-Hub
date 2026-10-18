# Seguridad

## Gestión de secretos

| Secreto | Dónde vive | Cómo se protege |
|---|---|---|
| Contraseña de PostgreSQL (local) | `.env` | Se genera aleatoria en el primer `start`; `.env` está en `.gitignore` |
| Contraseña de PostgreSQL (CI) | Generada por ejecución | No existe un valor fijo que filtrar |
| Contraseña de PostgreSQL (Producción) | Variable secreta `PROD_POSTGRES_PASSWORD` del pipeline | Marcada como secreta; el log la enmascara |
| Tokens de acceso personal (Git, agente) | Cuenta de cada persona | Alcance mínimo, expiración corta, se revocan si se exponen |

Reglas: ningún secreto en el repositorio, en capturas ni en la documentación; si uno se expone se revoca de inmediato y se genera otro.

## Controles en la aplicación

- Validación de todas las entradas en el servidor (tipos, longitudes, catálogos) y restricciones `CHECK` en la base de datos.
- Consultas SQL parametrizadas: sin concatenación de entrada de usuario.
- `helmet` en Express (cabeceras seguras) y límite de 100 kB en el cuerpo JSON.
- Errores internos sin detalles al cliente; el detalle queda en el log del servidor.
- nginx añade `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`.

## Controles en contenedores

- El backend corre con un usuario sin privilegios (`node`).
- Imágenes `alpine` y construcción por etapas: la imagen final no incluye dependencias de desarrollo ni código de pruebas.
- La base de datos y la API no publican puertos al host; solo se expone nginx.

## Controles en el pipeline

- `npm audit` sobre dependencias de producción: falla con severidad alta o crítica.
- Dependency Review en cada PR de GitHub.
- Reportes de auditoría publicados como artefactos.
- Permisos mínimos en GitHub Actions (`contents: read`).

## Limitaciones conocidas

La API no tiene autenticación ni autorización y el nombre de usuario lo envía el cliente. Está registrado como deuda técnica en `deuda-tecnica.md`.
