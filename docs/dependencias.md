# Análisis de dependencias

Fecha del análisis: 17 de octubre de 2026. Herramienta: `npm audit` (registro oficial de advisories de GitHub).

## Proceso

1. El pipeline ejecuta `npm audit` en backend y frontend en cada corrida y publica el reporte JSON como artefacto `dependency-audit`.
2. La etapa de seguridad **falla** si hay vulnerabilidades de severidad alta o crítica en dependencias de producción (`npm audit --omit=dev --audit-level=high`).
3. En GitHub, Dependency Review revisa cada Pull Request.
4. Los hallazgos en dependencias de desarrollo se evalúan y se corrigen por Pull Request, aunque no bloqueen el pipeline.

## Hallazgos iniciales (frontend)

`npm audit` reportó **4 vulnerabilidades (2 moderadas, 2 críticas)**, todas en la cadena de Vitest:

| Paquete | Severidad | Problema | Referencia |
|---|---|---|---|
| `tinypool` (<= 2.1.1) | Crítica | Contaminación de prototipo en opciones de workers que permite ejecución remota de código | GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr |
| `@vitest/mocker` (2.1.0 a 4.1.10) | Moderada | Recorrido de rutas y lectura arbitraria de archivos mediante redirección de mocks | GHSA-82fw-gwwq-j7x9 |
| `vitest` (hasta 4.1.10) | Moderada | Afectado por depender de las versiones vulnerables anteriores | Transitiva |
| `@vitest/coverage-v8` (hasta 4.1.10) | Moderada | Afectado por depender de `vitest` | Transitiva |

## Evaluación de riesgo

- Todos los paquetes afectados son **herramientas de desarrollo y pruebas**. No forman parte de la imagen de producción, que solo contiene los archivos estáticos compilados servidos por nginx.
- Aun así, un equipo que ejecuta pruebas con herramientas vulnerables está expuesto en su máquina y en el agente de CI, por lo que se decidió corregirlas y no aceptarlas.
- El backend no reportó hallazgos de severidad alta o crítica en dependencias de producción: la etapa de seguridad del pipeline pasa en cada corrida.

## Corrección aplicada

- Pull Request 10, rama `fix/dependencias-frontend`: actualización de `vitest` y `@vitest/coverage-v8` a la versión 5. La corrección disponible sin `--force` no existía, por lo que se aceptó el cambio mayor tras validarlo.
- Validación antes del merge: lint sin errores, 15 pruebas del frontend en verde, build de producción correcto.
- Resultado: `npm audit` informa **0 vulnerabilidades** y el pipeline posterior al merge terminó en verde.

## Mantenimiento

- Revisar el reporte `dependency-audit` de cada ejecución del pipeline.
- Mantener las versiones de las acciones de GitHub y las imágenes base actualizadas (ver deuda técnica D3).
- Si un hallazgo no se puede corregir, registrarlo aquí con la decisión, el responsable y la fecha de revisión.
