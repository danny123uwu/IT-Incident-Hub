# Arquitectura del Sistema

## Visión General

IT Incident Hub es una aplicación web full-stack para la gestión de incidentes de TI, construida siguiendo principios de arquitectura limpia y preparada para entrega continua (DevOps).

## Diagrama de Arquitectura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuario   │────▶│  Frontend   │────▶│   Backend   │
│  (Navegador)│     │  (React)    │     │ (Node/Express)│
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │  PostgreSQL │
                                         │  (Database) │
                                         └─────────────┘
```

## Stack Tecnológico

### Frontend
- **Framework**: React 18 con TypeScript
- **Build Tool**: Vite 5
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **UI**: CSS personalizado con variables CSS (sin dependencias de UI library)
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint + TypeScript ESLint

### Backend
- **Runtime**: Node.js 20+ con TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15+ con pg (node-postgres)
- **Validation**: Zod
- **Testing**: Jest + Supertest
- **Linting**: ESLint

### DevOps & Infrastructure
- **CI/CD**: Azure Pipelines + GitHub Actions
- **Containerization**: Docker / Docker Compose
- **Database Migrations**: Scripts TypeScript personalizados
- **Versioning**: Semantic Versioning (SemVer)
- **Secrets**: Azure Variable Groups / GitHub Secrets

## Estructura del Repositorio

```
incident-hub/
├── backend/                 # API Backend
│   ├── src/
│   │   ├── config/         # Configuración (env, DB)
│   │   ├── controllers/    # Controladores HTTP
│   │   ├── middleware/     # Middlewares (error handling, etc.)
│   │   ├── models/         # Modelos de datos (si aplica)
│   │   ├── routes/         # Definición de rutas
│   │   ├── services/       # Lógica de negocio
│   │   ├── types/          # Tipos TypeScript compartidos
│   │   ├── utils/          # Utilidades (validación, helpers)
│   │   ├── database/       # Migraciones y seeds
│   │   ├── tests/          # Tests unitarios e integración
│   │   └── index.ts        # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/          # Páginas (rutas)
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Servicios API
│   │   ├── types/          # Tipos TypeScript
│   │   ├── tests/          # Tests
│   │   ├── App.tsx         # App principal con routing
│   │   └── main.tsx        # Entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── database/               # Scripts SQL y migraciones
├── devops/                 # Configuraciones DevOps adicionales
├── docs/                   # Documentación del proyecto
├── .github/workflows/      # GitHub Actions
├── azure-pipelines.yml     # Azure Pipelines CI/CD
├── docker-compose.yml      # Desarrollo local
├── .env.example            # Variables de entorno ejemplo
└── README.md
```

## Modelo de Datos

### Tabla: incidents
| Campo | Tipo | Constraints |
|-------|------|-------------|
| id | UUID | PRIMARY KEY |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NOT NULL |
| category | VARCHAR(20) | NOT NULL, CHECK (HARDWARE, SOFTWARE, RED, SEGURIDAD, ACCESO, OTRO) |
| priority | VARCHAR(10) | NOT NULL, CHECK (BAJA, MEDIA, ALTA, CRITICA) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'NUEVO', CHECK (NUEVO, ASIGNADO, EN_PROCESO, RESUELTO, CERRADO) |
| reporter_id | UUID | NOT NULL |
| reporter_name | VARCHAR(100) | NOT NULL |
| assignee_id | UUID | NULLABLE |
| assignee_name | VARCHAR(100) | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| closed_at | TIMESTAMPTZ | NULLABLE |

### Tabla: comments
| Campo | Tipo | Constraints |
|-------|------|-------------|
| id | UUID | PRIMARY KEY |
| incident_id | UUID | NOT NULL, FK → incidents(id) ON DELETE CASCADE |
| author_id | UUID | NOT NULL |
| author_name | VARCHAR(100) | NOT NULL |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

### Índices
- `idx_incidents_status` en `status`
- `idx_incidents_priority` en `priority`
- `idx_incidents_category` en `category`
- `idx_incidents_assignee` en `assignee_id`
- `idx_incidents_reporter` en `reporter_id`
- `idx_incidents_created_at` en `created_at`
- `idx_comments_incident` en `incident_id`
- `idx_comments_created_at` en `created_at`

## API REST

### Base URL
```
/api
```

### Endpoints

#### Incidentes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/incidents` | Listar incidentes con filtros y paginación |
| POST | `/incidents` | Crear nuevo incidente |
| GET | `/incidents/:id` | Obtener incidente por ID |
| PATCH | `/incidents/:id` | Actualizar incidente (solo si no está CERRADO) |
| POST | `/incidents/:id/assign` | Asignar técnico y cambiar estado |
| PATCH | `/incidents/:id/status` | Cambiar estado (con validación de transiciones) |
| DELETE | `/incidents/:id` | Eliminar incidente y sus comentarios |
| GET | `/incidents/dashboard` | Obtener estadísticas del dashboard |

#### Comentarios
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/incidents/:id/comments` | Obtener comentarios de un incidente |
| POST | `/incidents/:id/comments` | Añadir comentario a un incidente |

### Filtros de Búsqueda (GET /incidents)
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| status | enum | NUEVO, ASIGNADO, EN_PROCESO, RESUELTO, CERRADO |
| priority | enum | BAJA, MEDIA, ALTA, CRITICA |
| category | enum | HARDWARE, SOFTWARE, RED, SEGURIDAD, ACCESO, OTRO |
| assigneeId | UUID | Filtrar por técnico asignado |
| reporterId | UUID | Filtrar por reportador |
| dateFrom | ISO8601 | Fecha inicio |
| dateTo | ISO8601 | Fecha fin |
| page | integer | Página (default: 1) |
| limit | integer | Items por página (default: 20, max: 100) |

### Transiciones de Estado Válidas
```
NUEVO ──────▶ ASIGNADO ──────▶ EN_PROCESO ──────▶ RESUELTO ──────▶ CERRADO
   │              │               │                  │
   └──────────────┴───────────────┴──────────────────┘
   (CERRADO directo desde cualquier estado)
```

### Códigos de Respuesta
| Código | Descripción |
|--------|-------------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Validation Error |
| 404 | Not Found |
| 409 | Conflict (transición inválida, incidente cerrado) |
| 500 | Internal Server Error |

## Seguridad

### Autenticación/Autorización
- **Nota**: En esta versión MVP, la autenticación se simula con headers/user context. Para producción se recomienda JWT + OAuth2/OIDC.

### Protección de Secretos
- Variables de entorno para configuración sensible
- Azure Variable Groups / GitHub Secrets para CI/CD
- Archivo `.env.example` como plantilla (sin valores reales)

### Headers de Seguridad (Helmet.js)
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- HSTS (en producción)

### Validación de Entrada
- Zod schemas en todos los endpoints
- Sanitización de datos de usuario
- Límites de tamaño de payload

## Escalabilidad y Rendimiento

### Base de Datos
- Connection pooling (max 20 conexiones)
- Índices en columnas de filtrado frecuente
- Paginación obligatoria en listados
- Queries optimizadas con SELECT específico

### Caching (Futuro)
- Redis para sesiones y cache de queries frecuentes
- CDN para assets estáticos del frontend

### Horizontal Scaling
- Backend stateless (preparado para múltiples instancias)
- Shared database con connection pooling
- Load balancer delante de instancias backend

## Observabilidad

### Logging
- Morgan para HTTP request logging
- Structured logging en servicios
- Niveles: error, warn, info, debug

### Health Checks
- `GET /health` - Verifica conectividad DB y servicio

### Métricas (Futuro)
- Prometheus metrics endpoint
- Distributed tracing con OpenTelemetry

## Decisiones Arquitectónicas (ADR)

### ADR-001: TypeScript en Frontend y Backend
**Decisión**: Usar TypeScript en todo el stack.
**Razón**: Type safety compartido, mejor DX, detección temprana de errores.

### ADR-002: PostgreSQL como Base de Datos
**Decisión**: PostgreSQL por robustez, tipos avanzados, JSON support.
**Alternativas**: MySQL, MongoDB (rechazadas por consistencia ACID y relaciones).

### ADR-003: Validación con Zod
**Decisión**: Zod para validación runtime + TypeScript types.
**Razón**: Single source of truth para tipos y validación, excelente DX.

### ADR-004: CSS Variables sin Framework UI
**Decisión**: CSS custom properties + utility classes propias.
**Razón**: Zero dependencies, bundle size mínimo, control total, fácil theming.

### ADR-005: Monorepo con Workspaces
**Decisión**: npm workspaces para frontend/backend en un repo.
**Razón**: Shared types, atomic commits, CI/CD simplificado, tooling unificado.