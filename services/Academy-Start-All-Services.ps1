# =============================================================================
# VRISHI ACADEMY - PLATFORM STARTUP SCRIPT
# =============================================================================
# Launches the VRishi Academy practice portal on top of the shared Jeeeth.ai infra:
# - Academy Web (Next.js plan site + dojo, port 3070)
# - Academy P0 services via docker overlay (ports 8600-8605) once built
# - Shared-infra preflight (network, pgbouncer, redis, minio, ollama)
#
# PORTS 8600-8605 / 3070 chosen after a 123-port census across the infra compose,
# Jeeth-AI-Start-All-Services.ps1 and VRishiHypno-Start-All-Services.ps1 (2026-08-08).
# The 8200 block belongs to KnowledgeFactory. Do not move ports without re-census.
#
# ASCII ONLY - Windows PowerShell Compatible
#
# Usage:
#   .\Academy-Start-All-Services.ps1              # Preflight + backend (if built) + web
#   .\Academy-Start-All-Services.ps1 -Frontend    # Web only
#   .\Academy-Start-All-Services.ps1 -Backend     # Docker overlay services only
#   .\Academy-Start-All-Services.ps1 -InfraCheck  # Shared-infra preflight only
#   .\Academy-Start-All-Services.ps1 -Stop        # Stop academy web + overlay
#   .\Academy-Start-All-Services.ps1 -Status      # Check status
#   .\Academy-Start-All-Services.ps1 -Endpoints   # Show all endpoints
#   .\Academy-Start-All-Services.ps1 -Help        # Show help
# =============================================================================

param(
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$InfraCheck,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Endpoints,
    [switch]$Debug,
    [switch]$Help
)

$ErrorActionPreference = "Continue"

# =============================================================================
# CONFIGURATION
# =============================================================================

$AcademyRoot = "D:\ChatGPT Projects\genai-portfolio\projects\Jeeth.ai\Business\VRishiHypno\PrepPractices"
$WebRoot     = Join-Path $AcademyRoot "apps\academy-web"
$ComposeFile = Join-Path $AcademyRoot "services\academy-compose.yml"

$FrontendPortal = @{
    Name = "Academy Web"
    Port = 3070
    Path = $WebRoot
    Description = "Plan site + Dojo gap dashboard (studio at P0)"
    Url = "http://localhost:3070"
}

# Academy P0 services (docker overlay; container health at /health once built)
$AcademyServices = @(
    @{Name="Academy Orchestrator"; Port=8600; Container="academy-orchestrator"; Dir="academy-orchestrator"; Description="Marks-to-turns state machine, WS bus"; Health="/health"},
    @{Name="Persona Service";      Port=8601; Container="academy-persona";      Dir="persona-svc";          Description="Avatar personas via jeethhypno-ollama"; Health="/health"},
    @{Name="ASR Service";          Port=8602; Container="academy-asr";          Dir="asr-svc";              Description="faster-whisper streaming"; Health="/health"},
    @{Name="TTS Service";          Port=8603; Container="academy-tts";          Dir="tts-svc";              Description="Piper/XTTS local, EL flavor optional"; Health="/health"},
    @{Name="Grader Service";       Port=8604; Container="academy-grader";       Dir="grader-svc";           Description="Aligner, rubric, lexicon classifier"; Health="/health"},
    @{Name="Progress Service";     Port=8605; Container="academy-progress";     Dir="progress-svc";         Description="Dual ledger, skill tree, real gap"; Health="/health"}
)

# Shared infra containers that must be up before academy services start
$RequiredInfra = @(
    @{Name="Postgres";  Container="jeethhypno-postgres"},
    @{Name="PgBouncer"; Container="jeethhypno-pgbouncer"},
    @{Name="Redis";     Container="jeethhypno-redis"},
    @{Name="MinIO";     Container="jeethhypno-minio"},
    @{Name="Ollama";    Container="jeethhypno-ollama"}
)

function Import-AcademyDotEnv {
    $envFile = Join-Path $AcademyRoot "services\.env"
    if (-not (Test-Path $envFile)) { return }
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
        $idx = $line.IndexOf('=')
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        if ($key -and -not (Get-Item -Path "Env:$key" -ErrorAction SilentlyContinue)) {
            Set-Item -Path "Env:$key" -Value $val
        }
    }
}

# =============================================================================
# OUTPUT HELPERS
# =============================================================================

function Write-Header { param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}
function Write-Step    { param([string]$Text) Write-Host "[STEP] $Text" -ForegroundColor Yellow }
function Write-Success { param([string]$Text) Write-Host "[OK]   $Text" -ForegroundColor Green }
function Write-ErrorMsg{ param([string]$Text) Write-Host "[FAIL] $Text" -ForegroundColor Red }
function Write-Info    { param([string]$Text) if ($Debug) { Write-Host "[INFO] $Text" -ForegroundColor Gray } }
function Write-Warn    { param([string]$Text) Write-Host "[WARN] $Text" -ForegroundColor DarkYellow }

# =============================================================================
# UTILITIES
# =============================================================================

function Test-PortInUse { param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $conn)
}

function Get-ProcessOnPort { param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) { return Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue }
    return $null
}

function Stop-ServiceOnPort { param([int]$Port, [string]$Name)
    $proc = Get-ProcessOnPort -Port $Port
    if ($proc) {
        Write-Warn "Port $Port busy ($Name) - stopping PID $($proc.Id) [$($proc.ProcessName)]"
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

function Test-ServiceHealth { param([string]$Url, [string]$ServiceName)
    Write-Info "Testing health for $ServiceName at $Url"
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400)
    } catch { return $false }
}

function Test-DockerReady {
    $cmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $cmd) { Write-ErrorMsg "docker CLI not found on PATH"; return $false }
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "Docker engine is not running"; return $false }
    return $true
}

function Test-ContainerRunning { param([string]$Container)
    $state = docker inspect -f '{{.State.Status}}' $Container 2>$null
    return ($LASTEXITCODE -eq 0 -and $state -match 'running')
}

# =============================================================================
# INFRA PREFLIGHT
# =============================================================================

function Invoke-InfraPreflight {
    Write-Header "SHARED INFRA PREFLIGHT (jeethhypno-shared-network)"
    if (-not (Test-DockerReady)) { return $false }

    docker network inspect jeethhypno-shared-network-global 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Network 'jeethhypno-shared-network' not found."
        Write-Warn  "Start the common stack first: infrastructure\docker\infra-stack-compose.yml"
        return $false
    }
    Write-Success "Network jeethhypno-shared-network present"

    $allUp = $true
    foreach ($svc in $RequiredInfra) {
        if (Test-ContainerRunning -Container $svc.Container) {
            Write-Success "$($svc.Name) ($($svc.Container)) running"
        } else {
            Write-ErrorMsg "$($svc.Name) ($($svc.Container)) NOT running"
            $allUp = $false
        }
    }
    if (-not $allUp) {
        Write-Warn "Bring up the common infra stack, then re-run. Academy services depend on it."
    }
    return $allUp
}

# =============================================================================
# BACKEND (DOCKER OVERLAY)
# =============================================================================

function Test-BackendBuilt {
    $missing = @()
    foreach ($svc in $AcademyServices) {
        $dockerfile = Join-Path (Join-Path $AcademyRoot "services") (Join-Path $svc.Dir "Dockerfile")
        if (-not (Test-Path $dockerfile)) { $missing += $svc.Dir }
    }
    return $missing
}

function Start-AcademyBackend {
    Write-Header "ACADEMY BACKEND (docker overlay, ports 8600-8605)"
    if (-not (Test-Path $ComposeFile)) { Write-ErrorMsg "Compose file missing: $ComposeFile"; return }

    $missing = Test-BackendBuilt
    if ($missing.Count -eq $AcademyServices.Count) {
        Write-Warn "P0 service code not built yet (no Dockerfiles under services\)."
        Write-Warn "SKIPPING backend start. Frontend and infra preflight remain available."
        return
    }
    if ($missing.Count -gt 0) {
        Write-Warn ("Missing Dockerfiles for: " + ($missing -join ", ") + " - compose will build only what exists.")
    }
    if (-not $env:ACADEMY_DB_PASSWORD) {
        Write-ErrorMsg "ACADEMY_DB_PASSWORD not set (compose interpolation will fail)."
        Write-Warn  "Set it in your shell or a .env next to academy-compose.yml, then re-run."
        return
    }

    Write-Step "docker compose -f academy-compose.yml --profile p0 up -d --build"
    docker compose -f $ComposeFile --profile p0 up -d --build
    if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "Compose up failed (exit $LASTEXITCODE)"; return }

    Start-Sleep -Seconds 3
    foreach ($svc in $AcademyServices) {
        $url = "http://localhost:$($svc.Port)$($svc.Health)"
        $healthy = $false
        for ($i = 0; $i -lt 10; $i++) {
            if (Test-ServiceHealth -Url $url -ServiceName $svc.Name) { $healthy = $true; break }
            Start-Sleep -Seconds 2
        }
        if ($healthy) { Write-Success "$($svc.Name) healthy on :$($svc.Port)" }
        else { Write-Warn "$($svc.Name) not answering $url yet (container may still be booting)" }
    }
}

function Stop-AcademyBackend {
    Write-Step "Stopping academy overlay containers"
    if ((Test-DockerReady) -and (Test-Path $ComposeFile)) {
        docker compose -f $ComposeFile --profile p0 down 2>&1 | Out-Null
        Write-Success "Overlay down"
    }
}

# =============================================================================
# FRONTEND
# =============================================================================

function Start-AcademyWeb {
    Write-Header "ACADEMY WEB (Next.js, port $($FrontendPortal.Port))"
    if (-not (Test-Path (Join-Path $FrontendPortal.Path "package.json"))) {
        Write-ErrorMsg "Web app not found at $($FrontendPortal.Path)"; return
    }
    Stop-ServiceOnPort -Port $FrontendPortal.Port -Name $FrontendPortal.Name

    if (-not (Test-Path (Join-Path $AcademyRoot "node_modules"))) {
        Write-Step "node_modules missing at repo root - running npm install (workspaces)"
        Push-Location $AcademyRoot
        npm install
        Pop-Location
        if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "npm install failed"; return }
    }

    $startupCmd = "Set-Location '$AcademyRoot'; npm run dev"
    $process = Start-Process powershell -ArgumentList "-NoExit", "-Command", $startupCmd -PassThru -WindowStyle Normal
    Write-Step "Launched dev server window (PID: $($process.Id)) - waiting for :$($FrontendPortal.Port)"

    $up = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 2
        if (Test-ServiceHealth -Url $FrontendPortal.Url -ServiceName $FrontendPortal.Name) { $up = $true; break }
    }
    if ($up) {
        Write-Success "$($FrontendPortal.Name) ready: $($FrontendPortal.Url)/plan/00-overview and /dojo"
    } else {
        Write-Warn "$($FrontendPortal.Name) not answering yet - check the dev window for compile output."
    }
}

# =============================================================================
# STATUS / ENDPOINTS / STOP / HELP
# =============================================================================

function Show-Status {
    Write-Header "VRISHI ACADEMY STATUS"
    $webUp = Test-PortInUse -Port $FrontendPortal.Port
    $webState = if ($webUp) { "RUNNING" } else { "stopped" }
    Write-Host ("  {0,-24} :{1,-5} {2}" -f $FrontendPortal.Name, $FrontendPortal.Port, $webState)
    foreach ($svc in $AcademyServices) {
        $state = "stopped"
        if (Test-DockerReady) {
            if (Test-ContainerRunning -Container $svc.Container) { $state = "RUNNING" }
        }
        Write-Host ("  {0,-24} :{1,-5} {2}" -f $svc.Name, $svc.Port, $state)
    }
    Write-Host ""
    Write-Host "  Shared infra:" -ForegroundColor Cyan
    foreach ($svc in $RequiredInfra) {
        $state = if ((Test-DockerReady) -and (Test-ContainerRunning -Container $svc.Container)) { "RUNNING" } else { "stopped" }
        Write-Host ("  {0,-24} {1,-28} {2}" -f $svc.Name, $svc.Container, $state)
    }
}

function Show-Endpoints {
    Write-Header "VRISHI ACADEMY ENDPOINTS"
    Write-Host ("  {0,-24} {1}" -f "Plan site",      "$($FrontendPortal.Url)/plan/00-overview")
    Write-Host ("  {0,-24} {1}" -f "Dojo (real gap)","$($FrontendPortal.Url)/dojo")
    foreach ($svc in $AcademyServices) {
        Write-Host ("  {0,-24} http://localhost:{1}{2}   {3}" -f $svc.Name, $svc.Port, $svc.Health, $svc.Description)
    }
}

function Show-Help {
    Write-Header "VRISHI ACADEMY - STARTUP HELP"
    Write-Host "  (default)     Infra preflight, backend if built, then web"
    Write-Host "  -Frontend     Web only (:3070)"
    Write-Host "  -Backend      Docker overlay services only (8600-8605)"
    Write-Host "  -InfraCheck   Shared-infra preflight only"
    Write-Host "  -Stop         Stop web + overlay"
    Write-Host "  -Status       Show what is running"
    Write-Host "  -Endpoints    List all URLs"
    Write-Host "  -Debug        Verbose health-check output"
}

Import-AcademyDotEnv

# =============================================================================
# MAIN
# =============================================================================

if ($Help)      { Show-Help; exit 0 }
if ($Status)    { Show-Status; exit 0 }
if ($Endpoints) { Show-Endpoints; exit 0 }

if ($Stop) {
    Write-Header "STOPPING VRISHI ACADEMY"
    Stop-ServiceOnPort -Port $FrontendPortal.Port -Name $FrontendPortal.Name
    Stop-AcademyBackend
    Write-Success "Academy stopped (shared infra left untouched)"
    exit 0
}

if ($InfraCheck) { $null = Invoke-InfraPreflight; exit 0 }

if ($Frontend) { Start-AcademyWeb; exit 0 }
if ($Backend)  { if (Invoke-InfraPreflight) { Start-AcademyBackend }; exit 0 }

# Default: everything
$infraOk = Invoke-InfraPreflight
if ($infraOk) { Start-AcademyBackend } else { Write-Warn "Skipping backend - shared infra not ready" }
Start-AcademyWeb
Write-Header "DONE"
Write-Host "  Plan: $($FrontendPortal.Url)/plan/00-overview   Dojo: $($FrontendPortal.Url)/dojo" -ForegroundColor Green
