# Lanzador de IT Incident Hub para Windows (PowerShell 5.1+ o PowerShell 7).
# Uso: .\devops\incident-hub.ps1 <start|stop|restart|status|logs|test|destroy> [-Service db] [-Yes]
param(
    [Parameter(Position = 0)]
    [string]$Command = 'help',
    [Parameter(Position = 1)]
    [string]$Service = '',
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Show-Usage {
    @'
IT Incident Hub - lanzador

  start            Construye y levanta base de datos, backend y frontend
  stop             Detiene los contenedores (conserva los datos)
  restart          Reinicia el sistema
  status           Muestra el estado de los contenedores
  logs [-Service]  Sigue los logs (db, backend o frontend)
  test             Ejecuta lint y pruebas de backend y frontend en contenedores
  destroy [-Yes]   BORRA contenedores, volumen de la base de datos e imagenes locales

Configuracion: archivo .env (se crea automaticamente en el primer start)
'@ | Write-Host
}

function Invoke-Compose {
    & docker compose @args
    if ($LASTEXITCODE -ne 0) { throw "docker compose fallo (codigo $LASTEXITCODE)" }
}

function Assert-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker no esta instalado. Instale Docker Desktop: https://docs.docker.com/get-docker/'
    }
    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) { throw "Falta el plugin 'docker compose' (Compose v2)." }
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) { throw 'El motor de Docker no esta en ejecucion. Inicie Docker Desktop y reintente.' }
}

function New-Password {
    $bytes = New-Object byte[] 16
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

function Initialize-Env {
    if (-not (Test-Path '.env')) {
        $password = New-Password
        (Get-Content '.env.example') -replace '^POSTGRES_PASSWORD=.*', "POSTGRES_PASSWORD=$password" |
            Set-Content -Path '.env' -Encoding ascii
        Write-Host 'Se creo .env con una contrasena aleatoria para la base de datos.'
    }
}

function Get-WebPort {
    $line = Select-String -Path '.env' -Pattern '^WEB_PORT=' | Select-Object -First 1
    if ($line) { return ($line.Line -split '=', 2)[1].Trim() }
    return '8080'
}

function Get-AppVersion {
    $match = Select-String -Path 'backend/package.json' -Pattern '"version":\s*"([^"]+)"' | Select-Object -First 1
    if ($match) { return $match.Matches[0].Groups[1].Value }
    return 'dev'
}

switch ($Command) {
    'start' {
        Assert-Docker; Initialize-Env
        if (-not $env:APP_VERSION) { $env:APP_VERSION = Get-AppVersion }
        Invoke-Compose up -d --build --wait
        Write-Host ''
        Write-Host "IT Incident Hub esta listo: http://localhost:$(Get-WebPort)"
    }
    'stop' {
        Assert-Docker; Initialize-Env
        Invoke-Compose stop
        Write-Host "Contenedores detenidos. Los datos se conservan (use 'destroy' para borrarlos)."
    }
    'restart' { Assert-Docker; Initialize-Env; Invoke-Compose restart }
    'status'  { Assert-Docker; Initialize-Env; Invoke-Compose ps }
    'logs' {
        Assert-Docker; Initialize-Env
        if ($Service) { Invoke-Compose logs -f --tail=100 $Service } else { Invoke-Compose logs -f --tail=100 }
    }
    'test' {
        Assert-Docker; Initialize-Env
        Write-Host '== Backend =='
        Invoke-Compose --profile test run --rm --build backend-test
        Write-Host '== Frontend =='
        Invoke-Compose --profile test run --rm --build frontend-test
        Write-Host 'Todas las pruebas pasaron.'
    }
    'destroy' {
        Assert-Docker; Initialize-Env
        if (-not $Yes) {
            Write-Host 'Esto BORRARA los contenedores, la base de datos (todos los incidentes) y las imagenes locales.'
            $answer = Read-Host "Escriba 'borrar' para continuar"
            if ($answer -ne 'borrar') { Write-Host 'Cancelado.'; exit 1 }
        }
        Invoke-Compose --profile test down --volumes --rmi local --remove-orphans
        Write-Host 'Todo fue eliminado. El archivo .env se conservo.'
    }
    { $_ -in 'help', '-h', '--help' } { Show-Usage }
    default {
        Write-Host "Comando desconocido: $Command" -ForegroundColor Red
        Show-Usage
        exit 1
    }
}
