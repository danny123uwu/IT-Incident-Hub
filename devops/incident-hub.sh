#!/usr/bin/env bash
# Lanzador de IT Incident Hub para Linux y macOS.
# Uso: ./devops/incident-hub.sh <start|stop|restart|status|logs|test|destroy> [opciones]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

usage() {
  cat <<'EOF'
IT Incident Hub - lanzador

  start            Construye y levanta base de datos, backend y frontend
  stop             Detiene los contenedores (conserva los datos)
  restart          Reinicia el sistema
  status           Muestra el estado de los contenedores
  logs [servicio]  Sigue los logs (db, backend o frontend)
  test             Ejecuta lint y pruebas de backend y frontend en contenedores
  destroy [--yes]  BORRA contenedores, volumen de la base de datos e imágenes locales

Variables de configuración: archivo .env (se crea automáticamente en el primer start)
EOF
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: Docker no está instalado. Instálelo desde https://docs.docker.com/get-docker/" >&2
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "ERROR: falta el plugin 'docker compose' (Compose v2)." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "ERROR: el motor de Docker no está en ejecución. Inicie Docker y reintente." >&2
    exit 1
  fi
}

gen_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 16
  else
    head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

ensure_env() {
  if [ ! -f .env ]; then
    local password
    password="$(gen_password)"
    sed "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${password}/" .env.example > .env
    chmod 600 .env 2>/dev/null || true
    echo "Se creó .env con una contraseña aleatoria para la base de datos."
  fi
}

web_port() {
  local port
  port="$(grep -E '^WEB_PORT=' .env 2>/dev/null | head -n1 | cut -d= -f2 || true)"
  echo "${port:-8080}"
}

app_version() {
  sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' backend/package.json | head -n1
}

cmd="${1:-help}"
shift || true

case "$cmd" in
  start)
    require_docker
    ensure_env
    export APP_VERSION="${APP_VERSION:-$(app_version)}"
    docker compose up -d --build --wait
    echo
    echo "IT Incident Hub está listo: http://localhost:$(web_port)"
    ;;
  stop)
    require_docker
    ensure_env
    docker compose stop
    echo "Contenedores detenidos. Los datos se conservan (use 'destroy' para borrarlos)."
    ;;
  restart)
    require_docker
    ensure_env
    docker compose restart
    ;;
  status)
    require_docker
    ensure_env
    docker compose ps
    ;;
  logs)
    require_docker
    ensure_env
    docker compose logs -f --tail=100 "$@"
    ;;
  test)
    require_docker
    ensure_env
    echo "== Backend =="
    docker compose --profile test run --rm --build backend-test
    echo "== Frontend =="
    docker compose --profile test run --rm --build frontend-test
    echo "Todas las pruebas pasaron."
    ;;
  destroy)
    require_docker
    ensure_env
    if [ "${1:-}" != "--yes" ]; then
      echo "Esto BORRARÁ los contenedores, la base de datos (todos los incidentes) y las imágenes locales."
      read -r -p "Escriba 'borrar' para continuar: " answer
      if [ "$answer" != "borrar" ]; then
        echo "Cancelado."
        exit 1
      fi
    fi
    docker compose --profile test down --volumes --rmi local --remove-orphans
    echo "Todo fue eliminado. El archivo .env se conservó."
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "Comando desconocido: $cmd" >&2
    usage >&2
    exit 1
    ;;
esac
