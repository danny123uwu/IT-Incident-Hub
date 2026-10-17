# Estrategia de ramas y trazabilidad

## Ramas

| Rama | Uso | Reglas |
|---|---|---|
| `main` | Código estable y liberable | Solo recibe cambios por Pull Request; el pipeline debe estar en verde |
| `feature/*` | Funcionalidad o documentación nueva | Sale de `main`, vive poco tiempo |
| `fix/*` | Corrección de errores (incluye fallos de pipeline) | Igual que `feature/*` |
| `refactor/*` | Mejora interna sin cambiar el comportamiento (deuda técnica) | Igual que `feature/*` |

Los nombres incluyen una descripción corta en minúsculas separada por guiones, por ejemplo `fix/azure-pipeline-pool`.

## Flujo de entrega

```
Task (Azure Boards) → rama feature/* → commits con AB#ID → Pull Request → revisión → merge a main → pipeline → artefacto → tag → release
```

## Commits

Se usa el formato `tipo: descripción AB#<id>`, con tipos `feat`, `fix`, `refactor`, `docs`, `chore` y `ci`.

```
fix: usar pool estático en azure-pipelines.yml AB#123
```

El `AB#<id>` vincula automáticamente el commit y el PR con el Work Item en Azure Boards.

## Pull Requests

Todo PR debe incluir:

1. **Descripción**: qué cambia y por qué.
2. **Work Item** vinculado (`AB#id`).
3. **Evidencia de validación**: resultado del pipeline o pruebas ejecutadas.
4. **Revisión** de al menos una persona antes del merge.

Se hace merge con historial conservado (Merge no fast forward) para poder reconstruir el trabajo.

## Versionado semántico

`MAJOR.MINOR.PATCH`, con un tag anotado `vX.Y.Z` sobre `main` en cada hito.

| Versión | Hito |
|---|---|
| `v0.1.0` | Estructura inicial: API, interfaz, contenedores, pruebas y pipelines |
| `v0.2.0` | Pipelines corregidos y estables (fallo controlado resuelto) |
| `v0.3.0` | Documentación, deuda técnica y dependencias |
| `v0.4.0` | Estrategia de release con ambientes y aprobaciones |
| `v1.0.0` | Versión liberada y demostrada |

Los cambios que solo corrigen errores incrementan `PATCH`; funcionalidad compatible incrementa `MINOR`; un cambio incompatible incrementaría `MAJOR`.
