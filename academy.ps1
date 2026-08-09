# =============================================================================
# VRISHI ACADEMY - ONE-STOP PROJECT SCRIPT (academy.ps1)
# =============================================================================
# Single entry point for every step of the project lifecycle.
#
# ASCII ONLY - Windows PowerShell / PowerShell 7 compatible
#
# Usage:  .\academy.ps1 <mode> [-DebugMode]
#
#   setup       Check prerequisites (node, npm, docker, python) and install deps
#   infra       Shared-infra preflight (network + core containers)
#   db-init     Create 'academy' role + database inside jeethhypno-postgres (idempotent)
#   render      Smoke-render the 3 example sessions from packages\session-templates
#   web         Start the Academy web app (:3070)
#   backend     Start the P0 docker overlay (8600-8605) - skips until code exists
#   all         infra + backend + web
#   test        render smoke + next build (CI-style local verification)
#   gap         Update the real-progress ledger (data\gap.json) interactively
#   status      What is running
#   endpoints   All URLs
#   stop        Stop academy web + overlay (shared infra untouched)
#   help        This text
# =============================================================================

param(
    [Parameter(Position = 0)]
    [ValidateSet("setup","infra","db-init","render","web","backend","all","test","gap","status","endpoints","stop","help")]
    [string]$Mode = "help",
    [switch]$DebugMode
)

$ErrorActionPreference = "Continue"

# Root = folder containing this script (repo root)
$AcademyRoot = $PSScriptRoot
if (-not $AcademyRoot) { $AcademyRoot = (Get-Location).Path }
$Starter     = Join-Path $AcademyRoot "services\Academy-Start-All-Services.ps1"
$TemplateDir = Join-Path $AcademyRoot "packages\session-templates"
$GapFile     = Join-Path $AcademyRoot "apps\academy-web\data\gap.json"
$WebPort     = 3070

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

# ---------------------------------------------------------------- output ----
function Write-Header { param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}
function Write-Step    { param([string]$Text) Write-Host "[STEP] $Text" -ForegroundColor Yellow }
function Write-Success { param([string]$Text) Write-Host "[OK]   $Text" -ForegroundColor Green }
function Write-ErrorMsg{ param([string]$Text) Write-Host "[FAIL] $Text" -ForegroundColor Red }
function Write-Info    { param([string]$Text) if ($DebugMode) { Write-Host "[INFO] $Text" -ForegroundColor Gray } }
function Write-Warn    { param([string]$Text) Write-Host "[WARN] $Text" -ForegroundColor DarkYellow }

# ---------------------------------------------------------------- helpers ---
function Invoke-Starter { param([string[]]$Arguments)
    if (-not (Test-Path $Starter)) { Write-ErrorMsg "Missing $Starter"; return }
    & $Starter @Arguments
}

function Get-PythonExe {
    if ($env:ACADEMY_PYTHON -and (Test-Path $env:ACADEMY_PYTHON)) { return $env:ACADEMY_PYTHON }
    $venv = "D:\ChatGPT Projects\venv311\Scripts\python.exe"
    if (Test-Path $venv) { return $venv }
    foreach ($name in @("python", "python3")) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    return $null
}

function Test-Tool { param([string]$Name, [string]$VersionArgs = "--version")
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) {
        $ver = ""
        try { $ver = (& $Name $VersionArgs 2>&1 | Select-Object -First 1) } catch { }
        Write-Success ("{0,-8} {1}" -f $Name, $ver)
        return $true
    }
    Write-ErrorMsg ("{0,-8} not found on PATH" -f $Name)
    return $false
}

# ---------------------------------------------------------------- modes -----
function Invoke-Setup {
    Write-Header "SETUP - PREREQUISITES + DEPENDENCIES"
    $okNode   = Test-Tool "node"
    $okNpm    = Test-Tool "npm"
    $okDocker = Test-Tool "docker"
    $py = Get-PythonExe
    if ($py) { Write-Success ("{0,-8} {1}" -f "python", $py) } else { Write-Warn "python not found - 'render' and 'test' modes need it" }
    if (-not ($okNode -and $okNpm)) { Write-ErrorMsg "Install Node 20+ first"; return }

    Write-Step "npm install (workspaces)"
    Push-Location $AcademyRoot
    npm install
    $npmExit = $LASTEXITCODE
    Pop-Location
    if ($npmExit -ne 0) { Write-ErrorMsg "npm install failed"; return }
    Write-Success "Node dependencies installed"

    if ($py) {
        Write-Step "pip install jinja2 pyyaml lxml (session-templates renderer)"
        & $py -m pip install --quiet jinja2 pyyaml lxml
        if ($LASTEXITCODE -eq 0) { Write-Success "Python renderer deps installed" }
        else { Write-Warn "pip install failed - fix before using 'render' / 'test'" }
    }
    if (-not $okDocker) { Write-Warn "Docker missing - 'infra', 'db-init', 'backend' modes unavailable" }
    Write-Success "Setup complete. Next: .\academy.ps1 infra  then  .\academy.ps1 web"
}

function Invoke-DbInit {
    Write-Header "DB-INIT - academy role + database in jeethhypno-postgres"
    $cmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $cmd) { Write-ErrorMsg "docker CLI not found"; return }
    docker inspect -f '{{.State.Status}}' jeethhypno-postgres 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "Container jeethhypno-postgres not found/running - start shared infra first"; return }

    $pgUser = if ($env:JEETHHYPNO_PG_USER) { $env:JEETHHYPNO_PG_USER } else { "jeethhypno_user" }
    $pgDb   = if ($env:JEETHHYPNO_PG_DB)   { $env:JEETHHYPNO_PG_DB }   else { "jeethhypno" }

    $pw = $env:ACADEMY_DB_PASSWORD
    if (-not $pw) {
        $secure = Read-Host "Enter NEW password for role 'academy'" -AsSecureString
        $pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
    }
    if (-not $pw) { Write-ErrorMsg "Empty password - aborting"; return }
    $pwEsc = $pw -replace "'", "''"

    Write-Step "Ensuring role 'academy' exists"
    $roleSql = "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='academy') THEN CREATE ROLE academy LOGIN PASSWORD '$pwEsc'; ELSE ALTER ROLE academy WITH LOGIN PASSWORD '$pwEsc'; END IF; END `$`$;"
    docker exec jeethhypno-postgres psql -U $pgUser -d $pgDb -v ON_ERROR_STOP=1 -c $roleSql
    if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "Role creation failed (check JEETHHYPNO_PG_USER/DB env overrides)"; return }
    Write-Success "Role 'academy' ready"

    Write-Step "Ensuring database 'academy' exists"
    $exists = docker exec jeethhypno-postgres psql -U $pgUser -d $pgDb -tAc "SELECT 1 FROM pg_database WHERE datname='academy'"
    if ($exists -notmatch "1") {
        docker exec jeethhypno-postgres psql -U $pgUser -d $pgDb -v ON_ERROR_STOP=1 -c "CREATE DATABASE academy OWNER academy"
        if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "CREATE DATABASE failed"; return }
        Write-Success "Database 'academy' created (owner: academy)"
    } else {
        Write-Success "Database 'academy' already exists"
    }
    Write-Warn "If pgbouncer does not use wildcard/auth_query, add 'academy' to its [databases] and reload."
    Write-Warn "Persist ACADEMY_DB_PASSWORD in your shell profile or services\.env (gitignored) for 'backend' mode."
}

function Invoke-Render {
    Write-Header "RENDER - session-templates smoke"
    $py = Get-PythonExe
    if (-not $py) { Write-ErrorMsg "python not found - run '.\academy.ps1 setup'"; return }
    $renderer = Join-Path $TemplateDir "render\render_session.py"
    if (-not (Test-Path $renderer)) { Write-ErrorMsg "Renderer missing: $renderer"; return }

    $outDir = Join-Path ([System.IO.Path]::GetTempPath()) "academy-render"
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    $cases = @(
        @{Profile="p1_physical_analyst.yaml";        Plan="vocational_presentation_confidence.session.yaml"; Out="p1_first.ssml"},
        @{Profile="p2_emotional_elder_caregiver.yaml"; Plan="referral_pain_comfort.session.yaml";            Out="p2_first.ssml"},
        @{Profile="p3_child_student.yaml";           Plan="avocational_sports_performance.session.yaml";     Out="p3_first.ssml"}
    )
    $failed = 0
    foreach ($case in $cases) {
        $profile = Join-Path $TemplateDir (Join-Path "examples\profiles" $case.Profile)
        $plan    = Join-Path $TemplateDir (Join-Path "templates" $case.Plan)
        $out     = Join-Path $outDir $case.Out
        & $py $renderer --profile $profile --plan $plan -o $out
        if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "Render failed: $($case.Profile)"; $failed++ }
    }
    if ($failed -eq 0) { Write-Success "All 3 renders OK -> $outDir" } else { Write-ErrorMsg "$failed render(s) failed" }
    return ($failed -eq 0)
}

function Invoke-TestMode {
    Write-Header "TEST - render smoke + next build"
    $renderOk = Invoke-Render
    Write-Step "npm run build (academy-web)"
    Push-Location $AcademyRoot
    npm run build
    $buildExit = $LASTEXITCODE
    Pop-Location
    if ($buildExit -eq 0) { Write-Success "next build OK" } else { Write-ErrorMsg "next build failed" }
    if ($renderOk -and $buildExit -eq 0) { Write-Success "TEST PASSED" } else { Write-ErrorMsg "TEST FAILED" }
}

function Invoke-GapUpdate {
    Write-Header "GAP - weekly real-progress ledger"
    if (-not (Test-Path $GapFile)) { Write-ErrorMsg "Missing $GapFile"; return }
    $gap = Get-Content -Raw $GapFile | ConvertFrom-Json
    Write-Host "  Press Enter to keep the current value." -ForegroundColor Gray
    foreach ($key in @("contacts","conferences","electives","workshops")) {
        $item = $gap.$key
        $answer = Read-Host ("  {0,-12} done [{1}/{2} {3}]" -f $key, $item.done, $item.need, $item.unit)
        if ($answer -match '^\d+$') { $item.done = [int]$answer }
    }
    $gap.asOf = (Get-Date -Format "yyyy-MM-dd")
    $gap | ConvertTo-Json -Depth 4 | Set-Content -Path $GapFile -Encoding UTF8
    Write-Success "gap.json updated (asOf $($gap.asOf))"
    $days = [math]::Max(0, [math]::Ceiling(([datetime]$gap.hardStop - (Get-Date)).TotalDays))
    Write-Host ("  Contacts {0}/{1}  Conferences {2}/{3}  Electives {4}/{5}  Workshops {6}/{7}  |  {8} days to {9}" -f `
        $gap.contacts.done, $gap.contacts.need, $gap.conferences.done, $gap.conferences.need, `
        $gap.electives.done, $gap.electives.need, $gap.workshops.done, $gap.workshops.need, $days, $gap.hardStop) -ForegroundColor Cyan
    Write-Host "  Refresh /dojo in the browser to see the dials move." -ForegroundColor Gray
}

function Show-Help {
    Write-Header "VRISHI ACADEMY - ONE-STOP SCRIPT"
    Write-Host "  .\academy.ps1 setup       Prereqs + npm install + renderer deps"
    Write-Host "  .\academy.ps1 infra       Shared-infra preflight"
    Write-Host "  .\academy.ps1 db-init     Create academy role + db (idempotent)"
    Write-Host "  .\academy.ps1 render      Smoke-render the 3 example sessions"
    Write-Host "  .\academy.ps1 web         Start web app (:$WebPort)"
    Write-Host "  .\academy.ps1 backend     Start P0 overlay (8600-8605; skips until built)"
    Write-Host "  .\academy.ps1 all         infra + backend + web"
    Write-Host "  .\academy.ps1 test        Render smoke + next build"
    Write-Host "  .\academy.ps1 gap         Update weekly real-progress ledger"
    Write-Host "  .\academy.ps1 status      What is running"
    Write-Host "  .\academy.ps1 endpoints   All URLs"
    Write-Host "  .\academy.ps1 stop        Stop web + overlay"
    Write-Host ""
    Write-Host "  Typical first run:  setup -> infra -> db-init -> web" -ForegroundColor Gray
    Write-Host "  Weekly rhythm:      gap -> web (check /dojo) -> practice" -ForegroundColor Gray
}

Import-AcademyDotEnv

# ---------------------------------------------------------------- dispatch --
switch ($Mode) {
    "setup"     { Invoke-Setup }
    "infra"     { Invoke-Starter @("-InfraCheck") }
    "db-init"   { Invoke-DbInit }
    "render"    { $null = Invoke-Render }
    "web"       { Invoke-Starter @("-Frontend") }
    "backend"   { Invoke-Starter @("-Backend") }
    "all"       { Invoke-Starter @() }
    "test"      { Invoke-TestMode }
    "gap"       { Invoke-GapUpdate }
    "status"    { Invoke-Starter @("-Status") }
    "endpoints" { Invoke-Starter @("-Endpoints") }
    "stop"      { Invoke-Starter @("-Stop") }
    default     { Show-Help }
}
