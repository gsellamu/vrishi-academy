# daily-checkin.ps1 - Safe daily git check-in for vrishi-academy
#
# DESIGN PRINCIPLES
#   * Pushes the CURRENT branch (never hardcoded to main)
#   * Never force-pushes, never rewrites history, never rewrites origin URL
#   * Never runs `git rm -r --cached .` (the source of the April 5 "AD" disaster)
#   * Respects pre-commit hooks - if they fail, we STOP and report clearly
#   * Never claims success on failure
#   * Tagging is OPT-IN (-Tag) and only on main, not automatic
#   * Secrets preflight (.env, credentials, keys) before staging
#   * Idempotent - running it twice in a row with no changes is a no-op
#
# USAGE
#   .\daily-checkin.ps1                     # interactive, current branch
#   .\daily-checkin.ps1 -Message "sync"     # non-interactive commit message
#   .\daily-checkin.ps1 -DryRun             # show what would happen
#   .\daily-checkin.ps1 -Tag                # create+push tag (main only)
#   .\daily-checkin.ps1 -SkipHooks          # bypass hooks (asks to confirm)

[CmdletBinding()]
param(
    [string]$Message = "",
    [switch]$DryRun,
    [switch]$Tag,
    [switch]$SkipHooks
)

$ErrorActionPreference = "Continue"

$ExpectedRepo = "gsellamu/vrishi-academy"
$ExpectedUrls = @(
    "https://github.com/gsellamu/vrishi-academy.git",
    "git@github.com:gsellamu/vrishi-academy.git"
)

# --- Helpers ---
function Write-Step  { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "    [!!] $msg" -ForegroundColor Yellow }
function Write-Fail  { param($msg) Write-Host "    [XX] $msg" -ForegroundColor Red }
function Abort       { param($msg) Write-Fail $msg; exit 1 }

# --- Banner ---
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   vrishi-academy Daily Check-in (safe, branch-aware)" -ForegroundColor Cyan
Write-Host "   -> $ExpectedRepo" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# --- 1. Sanity: in a git repo ---
Write-Step "Checking environment"
git rev-parse --is-inside-work-tree > $null 2>&1
if ($LASTEXITCODE -ne 0) { Abort "Not inside a git repository." }
Write-Ok "git repo detected"

# --- 2. Sanity: no rebase / merge / cherry-pick in progress ---
$rebaseStates = @(".git/rebase-merge", ".git/rebase-apply", ".git/MERGE_HEAD", ".git/CHERRY_PICK_HEAD")
$stuck = $rebaseStates | Where-Object { Test-Path $_ }
if ($stuck) {
    Abort "Git is mid-operation. Found: $($stuck -join ', '). Resolve manually before running this script."
}
Write-Ok "no rebase / merge / cherry-pick in progress"

# --- 3. Sanity: origin URL matches expected ---
$originUrl = (git config --get remote.origin.url).Trim()
if ([string]::IsNullOrEmpty($originUrl) -or $originUrl -eq "https://github.com" -or $originUrl -eq "https://github.com/") {
    Abort "origin URL is broken: '$originUrl'. Fix with: git remote set-url origin $($ExpectedUrls[0])"
}
if ($ExpectedUrls -notcontains $originUrl) {
    Write-Warn "origin URL is '$originUrl' (expected one of: $($ExpectedUrls -join ', '))"
    $confirm = Read-Host "    Continue anyway? Type 'YES' to proceed"
    if ($confirm -ne "YES") { Abort "user aborted due to origin mismatch" }
} else {
    Write-Ok "origin: $originUrl"
}

# --- 4. Determine current branch ---
$branch = (git branch --show-current).Trim()
if ([string]::IsNullOrEmpty($branch)) { Abort "Detached HEAD - no branch to push." }
Write-Ok "branch: $branch"

# --- 5. Show what's changed ---
Write-Step "Working-tree status"
$statusLines = git status --short
if (-not $statusLines) {
    Write-Ok "working tree clean"
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $unpushed = git log "origin/$branch..HEAD" --oneline 2>$null
    $ErrorActionPreference = $prevPref
    if (-not $unpushed) {
        Write-Host "    Nothing to commit, nothing to push. Exiting." -ForegroundColor Gray
        exit 0
    }
    Write-Warn "working tree clean but local branch has unpushed commits:"
    $unpushed | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
} else {
    $statusLines | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
}

# --- 6. Fetch (NEVER pull/rebase automatically) ---
Write-Step "Fetching origin (no pull, no rebase)"
$prevPref = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$isNewBranch = $false
$fetchOutput = & git fetch origin $branch 2>&1
if ($LASTEXITCODE -ne 0) {
    $fetchText = ($fetchOutput | Out-String)
    if ($fetchText -match "couldn't find remote ref" -or $fetchText -match "no such ref was fetched" -or $fetchText -match "does not appear to be a git repository") {
        Write-Warn "branch not on origin yet (likely a new feature branch) - that's OK"
        $isNewBranch = $true
    } else {
        Write-Fail "git fetch failed for a non-new-branch reason:"
        $fetchText -split "`n" | ForEach-Object { if ($_.Trim()) { Write-Host "      $_" -ForegroundColor Gray } }
        $ErrorActionPreference = $prevPref
        Abort "refusing to continue with unknown fetch failure"
    }
} else {
    Write-Ok "fetched origin/$branch"
}
$ErrorActionPreference = $prevPref

# --- 7. Divergence check (skip if new branch) ---
if (-not $isNewBranch) {
    $ErrorActionPreference = "Continue"
    $behind = & git rev-list --count "HEAD..origin/$branch" 2>&1
    $ahead  = & git rev-list --count "origin/$branch..HEAD" 2>&1
    $ErrorActionPreference = $prevPref

    if ([string]::IsNullOrEmpty($behind) -or -not ($behind -match "^\d+$")) {
        Abort "could not determine divergence (behind='$behind')"
    }
    if ([string]::IsNullOrEmpty($ahead) -or -not ($ahead -match "^\d+$")) {
        Abort "could not determine divergence (ahead='$ahead')"
    }

    if ([int]$behind -gt 0) {
        Write-Warn "local branch is $behind commit(s) behind origin/$branch"
        Write-Warn "This script does NOT auto-rebase. Please resolve manually:"
        Write-Host  "      git pull --rebase origin $branch   # then re-run this script" -ForegroundColor Gray
        Abort "refusing to push while behind remote"
    }
    Write-Ok "ahead: $ahead, behind: $behind"
} else {
    Write-Ok "new branch - divergence check skipped"
}

# --- 8. Stage changes ---
if ($statusLines) {
    Write-Step "Staging changes"

    # Safety #1: refuse to stage likely secrets (.env, credentials, keys, pems).
    $dangerPattern = '(^|/|\\)\.env(\.|$)|credentials|secrets?\.(ya?ml|json|txt)|\.pem$|\.key$|id_rsa|\.pfx$'
    $dangerFiles = $statusLines | Where-Object { $_ -match $dangerPattern }
    if ($dangerFiles) {
        Write-Fail "Refusing to stage files that look like secrets:"
        $dangerFiles | ForEach-Object { Write-Host "      $_" -ForegroundColor Red }
        Write-Host "    Add these to .gitignore, or if intentional, stage them manually with:" -ForegroundColor Gray
        Write-Host "      git add <file> && git commit" -ForegroundColor Gray
        Abort "secrets preflight blocked commit"
    }
    Write-Ok "secrets preflight clean"

    # Safety #2: count how many files would be staged (tracked changes + untracked)
    $fileCount = ($statusLines | Measure-Object).Count
    Write-Host "    About to stage $fileCount file(s)" -ForegroundColor Gray
    if ($fileCount -gt 20 -and -not $DryRun) {
        Write-Warn "Staging more than 20 files. Review the list above carefully."
        $confirm = Read-Host "    Type 'YES' to stage all $fileCount files, or anything else to abort"
        if ($confirm -ne "YES") { Abort "user aborted mass-stage" }
    }
    if ($DryRun) {
        Write-Warn "DryRun: skipping git add"
    } else {
        git add -A
        if ($LASTEXITCODE -ne 0) { Abort "git add failed" }
        Write-Ok "staged all changes"
    }

    # --- 9. Commit message ---
    if ([string]::IsNullOrWhiteSpace($Message)) {
        Write-Host ""
        $Message = Read-Host "Commit message"
        if ([string]::IsNullOrWhiteSpace($Message)) {
            Abort "empty commit message"
        }
    }

    # --- 10. Commit (pre-commit hooks run HERE; if they fail, we stop) ---
    Write-Step "Committing"
    if ($DryRun) {
        Write-Warn "DryRun: would commit with message: '$Message'"
    } else {
        $commitArgs = @("commit", "-m", $Message)
        if ($SkipHooks) {
            $confirmSkip = Read-Host "WARNING: -SkipHooks bypasses pre-commit. Type 'SKIP' to confirm"
            if ($confirmSkip -ne "SKIP") { Abort "did not confirm SkipHooks" }
            $commitArgs += "--no-verify"
            Write-Warn "bypassing pre-commit hooks (not recommended)"
        }

        & git @commitArgs
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "commit failed (likely pre-commit hook failure)"
            Write-Warn "Your changes are still staged. Options:"
            Write-Host  "      1) Fix the hook errors above and re-run this script" -ForegroundColor Gray
            Write-Host  "      2) Unstage with: git reset HEAD" -ForegroundColor Gray
            Write-Host  "      3) Bypass hooks (last resort): .\daily-checkin.ps1 -SkipHooks" -ForegroundColor Gray
            exit 1
        }
        Write-Ok "committed"
    }
}

# --- 11. Push (CURRENT BRANCH, never force) ---
Write-Step "Pushing origin/$branch (no force)"
if ($DryRun) {
    Write-Warn "DryRun: would run: git push -u origin $branch"
} else {
    git push -u origin $branch
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "push failed"
        exit 1
    }
    Write-Ok "pushed to origin/$branch"
}

# --- 12. Tag (opt-in, main only) ---
if ($Tag) {
    if ($branch -ne "main") {
        Write-Warn "Tagging is only allowed on main. Current branch: $branch. Skipping tag."
    } else {
        Write-Step "Tagging"
        $latest = git tag -l "v*" --sort=-v:refname | Select-Object -First 1
        if (-not $latest) { $latest = "v0.0.0" }
        if ($latest -match "^v(\d+)\.(\d+)\.(\d+)$") {
            $new = "v$($matches[1]).$($matches[2]).$([int]$matches[3] + 1)"
        } else {
            Abort "cannot parse latest tag '$latest' for auto-increment"
        }
        Write-Host "    latest tag: $latest -> new tag: $new" -ForegroundColor Gray
        if ($DryRun) {
            Write-Warn "DryRun: would create tag $new and push it"
        } else {
            git tag -a $new -m "Daily checkin $new"
            git push origin $new
            Write-Ok "tag $new pushed"
        }
    }
}

# --- Done ---
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   Check-in complete: $branch -> $ExpectedRepo" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
