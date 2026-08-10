# =============================================================================
# VRISHI ACADEMY - AWS CLOUD DEPLOYMENT SCRIPT (cloud-deploy.ps1)
# =============================================================================
# One-click lifecycle management for AWS App Runner + Free Tier infrastructure.
#
# ASCII ONLY - Windows PowerShell / PowerShell 7 compatible
#
# Usage:  .\cloud-deploy.ps1 <mode> [-Region us-east-1] [-Environment production]
#
#   preflight   Verify AWS CLI, Terraform, Docker, credentials
#   init        Terraform init (first time only)
#   plan        Preview infrastructure changes
#   deploy      Apply Terraform + push images + activate services
#   push        Build and push Docker images to ECR (no infra changes)
#   redeploy    Push images + trigger App Runner redeployment
#   secrets     Set/rotate invite code, view secret ARNs
#   schema      Apply DB schema to RDS via bastion/SSM
#   status      Show all service statuses, URLs, and costs
#   health      Deep health check (HTTP healthz on each service)
#   logs        Tail App Runner logs for a service
#   pause       Pause all services ($0 compute cost)
#   resume      Resume all paused services
#   cost        Estimate current monthly spend
#   urls        Print service URLs for frontend config
#   destroy     Tear down all AWS resources (with confirmation)
#   help        This text
#
# First-time setup:
#   .\cloud-deploy.ps1 preflight
#   .\cloud-deploy.ps1 init
#   .\cloud-deploy.ps1 deploy
#   .\cloud-deploy.ps1 secrets -InviteCode "your-code"
#
# Daily workflow:
#   .\cloud-deploy.ps1 resume        # start practicing
#   .\cloud-deploy.ps1 health        # verify everything works
#   .\cloud-deploy.ps1 pause         # done for the day ($0)
#
# After code changes:
#   .\cloud-deploy.ps1 redeploy      # build + push + restart
# =============================================================================

param(
    [Parameter(Position = 0)]
    [ValidateSet("preflight","init","plan","deploy","push","redeploy","secrets","schema","status","health","logs","pause","resume","cost","urls","destroy","help")]
    [string]$Mode = "help",

    [string]$Region = "us-east-1",
    [string]$Environment = "production",
    [string]$GitHubOrg = "",
    [string]$GitHubRepo = "",
    [string]$InviteCode = "",
    [string]$Service = "",
    [switch]$Force,
    [switch]$DebugMode
)

$ErrorActionPreference = "Continue"

# ---------------------------------------------------------------- paths ------
$ScriptRoot  = $PSScriptRoot
if (-not $ScriptRoot) { $ScriptRoot = (Get-Location).Path }
$TfDir       = Join-Path $ScriptRoot "deploy\aws"
$ServicesDir = Join-Path $ScriptRoot "services"
$RepoRoot    = $ScriptRoot

$ServiceNames = @("academy-user", "academy-progress", "academy-grader")
$EcrRepos     = @{
    "academy-user"     = "vrishi-academy/user-svc"
    "academy-progress" = "vrishi-academy/progress-svc"
    "academy-grader"   = "vrishi-academy/grader-svc"
}
$Dockerfiles  = @{
    "academy-user"     = "services/academy-user-svc/Dockerfile"
    "academy-progress" = "services/academy-progress-svc/Dockerfile"
    "academy-grader"   = "services/academy-grader-svc/Dockerfile"
}

# ---------------------------------------------------------------- output -----
function Write-Header { param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}
function Write-Step    { param([string]$Text) Write-Host "[STEP] $Text" -ForegroundColor Yellow }
function Write-Success { param([string]$Text) Write-Host "[OK]   $Text" -ForegroundColor Green }
function Write-ErrorMsg{ param([string]$Text) Write-Host "[FAIL] $Text" -ForegroundColor Red }
function Write-Info    { param([string]$Text) Write-Host "[INFO] $Text" -ForegroundColor Gray }
function Write-Warn    { param([string]$Text) Write-Host "[WARN] $Text" -ForegroundColor DarkYellow }

# ---------------------------------------------------------------- helpers ----
function Test-Tool { param([string]$Name, [string]$VersionArgs = "--version")
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) {
        $ver = ""
        try { $ver = (& $Name $VersionArgs 2>&1 | Select-Object -First 1) } catch { }
        Write-Success ("{0,-12} {1}" -f $Name, $ver)
        return $true
    }
    Write-ErrorMsg ("{0,-12} not found on PATH" -f $Name)
    return $false
}

function Get-AwsAccountId {
    $acct = aws sts get-caller-identity --query "Account" --output text 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return $acct
}

function Get-EcrRegistry {
    $acct = Get-AwsAccountId
    if (-not $acct) { return $null }
    return "$acct.dkr.ecr.$Region.amazonaws.com"
}

function Get-ServiceArn { param([string]$Name)
    $arn = aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$Name'].ServiceArn" --output text --region $Region 2>$null
    if ($arn -and $arn -ne "None" -and $arn -ne "") { return $arn }
    return $null
}

function Get-ServiceInfo { param([string]$Name)
    $arn = Get-ServiceArn $Name
    if (-not $arn) { return $null }
    $json = aws apprunner describe-service --service-arn $arn --region $Region --output json 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return $json | ConvertFrom-Json
}

function Invoke-TfCommand { param([string[]]$Args)
    Push-Location $TfDir
    $tfVars = @()
    if ($Region)      { $tfVars += "-var=region=$Region" }
    if ($Environment) { $tfVars += "-var=environment=$Environment" }
    if ($GitHubOrg)   { $tfVars += "-var=github_org=$GitHubOrg" }
    if ($GitHubRepo)  { $tfVars += "-var=github_repo=$GitHubRepo" }
    terraform @Args @tfVars
    $exitCode = $LASTEXITCODE
    Pop-Location
    return $exitCode
}

# ================================================================ MODES ======

function Invoke-Preflight {
    Write-Header "PREFLIGHT - verify tools and credentials"

    $ok = $true
    if (-not (Test-Tool "aws" "--version"))       { $ok = $false }
    if (-not (Test-Tool "terraform" "--version"))  { $ok = $false }
    if (-not (Test-Tool "docker" "--version"))     { $ok = $false }

    Write-Step "Checking AWS credentials"
    $acct = Get-AwsAccountId
    if ($acct) {
        $identity = aws sts get-caller-identity --output json 2>$null | ConvertFrom-Json
        Write-Success ("AWS Account:  {0}" -f $acct)
        Write-Info    ("IAM Identity: {0}" -f $identity.Arn)
        Write-Info    ("Region:       {0}" -f $Region)
    } else {
        Write-ErrorMsg "AWS credentials not configured. Run: aws configure"
        $ok = $false
    }

    Write-Step "Checking Docker daemon"
    docker info > $null 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Success "Docker daemon running" }
    else { Write-ErrorMsg "Docker daemon not running"; $ok = $false }

    Write-Step "Checking Terraform directory"
    if (Test-Path (Join-Path $TfDir "main.tf")) { Write-Success "Terraform config found at deploy/aws/" }
    else { Write-ErrorMsg "Missing deploy/aws/main.tf"; $ok = $false }

    Write-Step "Checking Dockerfiles"
    foreach ($svc in $ServiceNames) {
        $df = Join-Path $RepoRoot $Dockerfiles[$svc]
        if (Test-Path $df) { Write-Success ("  {0}" -f $Dockerfiles[$svc]) }
        else { Write-ErrorMsg ("  Missing: {0}" -f $Dockerfiles[$svc]); $ok = $false }
    }

    if ($ok) {
        Write-Host ""
        Write-Success "All preflight checks passed. Next: .\cloud-deploy.ps1 init"
    } else {
        Write-Host ""
        Write-ErrorMsg "Some checks failed. Fix the issues above before proceeding."
    }
}

function Invoke-Init {
    Write-Header "INIT - terraform init"
    Push-Location $TfDir
    terraform init
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -eq 0) {
        Write-Success "Terraform initialized. Next: .\cloud-deploy.ps1 plan"
    } else {
        Write-ErrorMsg "Terraform init failed"
    }
}

function Invoke-Plan {
    Write-Header "PLAN - preview infrastructure changes"
    $exitCode = Invoke-TfCommand @("plan", "-out=tfplan")
    if ($exitCode -eq 0) {
        Write-Success "Plan saved. Review above, then: .\cloud-deploy.ps1 deploy"
    } else {
        Write-ErrorMsg "Terraform plan failed"
    }
}

function Invoke-Deploy {
    Write-Header "DEPLOY - provision infrastructure + push images + activate"

    # Phase 1: Terraform apply
    Write-Step "Phase 1/4: Provisioning AWS infrastructure"
    $planFile = Join-Path $TfDir "tfplan"
    if (Test-Path $planFile) {
        Write-Info "Applying saved plan from 'plan' step"
        Push-Location $TfDir
        terraform apply tfplan
        $tfExit = $LASTEXITCODE
        Pop-Location
    } else {
        Write-Info "No saved plan found, running plan + apply"
        $tfExit = Invoke-TfCommand @("apply", "-auto-approve")
    }
    if ($tfExit -ne 0) { Write-ErrorMsg "Terraform apply failed"; return }
    Write-Success "Infrastructure provisioned"

    # Phase 2: Push images
    Write-Step "Phase 2/4: Building and pushing Docker images to ECR"
    Invoke-Push
    if (-not $?) { Write-ErrorMsg "Image push failed"; return }

    # Phase 3: Trigger deployments
    Write-Step "Phase 3/4: Triggering App Runner deployments"
    foreach ($svc in $ServiceNames) {
        $arn = Get-ServiceArn $svc
        if (-not $arn) { Write-Warn "Service $svc not found (may need first image push)"; continue }
        Write-Info "Triggering deployment: $svc"
        aws apprunner start-deployment --service-arn $arn --region $Region > $null 2>&1
    }

    # Phase 4: Wait for stability
    Write-Step "Phase 4/4: Waiting for services to stabilize"
    $allOk = $true
    foreach ($svc in $ServiceNames) {
        $arn = Get-ServiceArn $svc
        if (-not $arn) { continue }
        Write-Info "Waiting for $svc..."
        $attempts = 0
        $maxAttempts = 40  # 40 x 15s = 10 minutes
        while ($attempts -lt $maxAttempts) {
            $status = aws apprunner describe-service --service-arn $arn --query "Service.Status" --output text --region $Region 2>$null
            if ($status -eq "RUNNING") {
                Write-Success "$svc is RUNNING"
                break
            }
            if ($status -match "FAILED") {
                Write-ErrorMsg "$svc deployment FAILED: $status"
                $allOk = $false
                break
            }
            $attempts++
            Start-Sleep -Seconds 15
        }
        if ($attempts -ge $maxAttempts) {
            Write-Warn "$svc did not stabilize within 10 minutes"
            $allOk = $false
        }
    }

    if ($allOk) {
        Write-Host ""
        Write-Success "Deployment complete!"
        Write-Host ""
        Invoke-Urls
        Write-Host ""
        Write-Info "Set your invite code: .\cloud-deploy.ps1 secrets -InviteCode 'your-code'"
        Write-Info "Apply DB schema:      .\cloud-deploy.ps1 schema"
        Write-Info "Pause when done:      .\cloud-deploy.ps1 pause"
    } else {
        Write-ErrorMsg "Some services did not deploy successfully. Run: .\cloud-deploy.ps1 status"
    }
}

function Invoke-Push {
    Write-Header "PUSH - build and push Docker images to ECR"

    $registry = Get-EcrRegistry
    if (-not $registry) { Write-ErrorMsg "Cannot determine ECR registry. Check AWS credentials."; return }

    Write-Step "Logging into ECR"
    aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $registry
    if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "ECR login failed"; return }
    Write-Success "ECR login successful"

    $sha = git rev-parse --short HEAD 2>$null
    if (-not $sha) { $sha = "latest" }

    foreach ($svc in $ServiceNames) {
        $ecrRepo  = $EcrRepos[$svc]
        $dockerfile = $Dockerfiles[$svc]
        $imageTag = "$registry/${ecrRepo}:$sha"
        $latestTag = "$registry/${ecrRepo}:latest"

        Write-Step "Building $svc"
        docker build -t $imageTag -t $latestTag -f $dockerfile $RepoRoot
        if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "Build failed: $svc"; return }

        Write-Step "Pushing $svc"
        docker push $imageTag
        docker push $latestTag
        if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "Push failed: $svc"; return }
        Write-Success "$svc pushed ($sha)"
    }
    Write-Success "All images pushed to ECR"
}

function Invoke-Redeploy {
    Write-Header "REDEPLOY - push images + trigger App Runner redeployment"

    Invoke-Push
    if (-not $?) { return }

    Write-Step "Triggering App Runner redeployments"
    foreach ($svc in $ServiceNames) {
        $arn = Get-ServiceArn $svc
        if (-not $arn) { Write-Warn "Service $svc not found"; continue }
        aws apprunner start-deployment --service-arn $arn --region $Region > $null 2>&1
        if ($LASTEXITCODE -eq 0) { Write-Success "Triggered: $svc" }
        else { Write-ErrorMsg "Failed to trigger: $svc" }
    }

    Write-Step "Waiting for services to stabilize"
    foreach ($svc in $ServiceNames) {
        $arn = Get-ServiceArn $svc
        if (-not $arn) { continue }
        $attempts = 0
        while ($attempts -lt 40) {
            $status = aws apprunner describe-service --service-arn $arn --query "Service.Status" --output text --region $Region 2>$null
            if ($status -eq "RUNNING") { Write-Success "$svc RUNNING"; break }
            if ($status -match "FAILED") { Write-ErrorMsg "$svc FAILED"; break }
            $attempts++
            Start-Sleep -Seconds 15
        }
    }
    Write-Success "Redeployment complete. Run: .\cloud-deploy.ps1 health"
}

function Invoke-Secrets {
    Write-Header "SECRETS - manage SSM Parameter Store secrets"

    $prefix = "/academy/$Environment"

    if ($InviteCode) {
        Write-Step "Setting invite code"
        aws ssm put-parameter --name "$prefix/invite-code" --value $InviteCode --type SecureString --overwrite --region $Region > $null 2>&1
        if ($LASTEXITCODE -eq 0) { Write-Success "Invite code updated" }
        else { Write-ErrorMsg "Failed to update invite code" }
    }

    Write-Step "Current secrets"
    $params = aws ssm describe-parameters --parameter-filters "Key=Name,Values=$prefix/" --region $Region --output json 2>$null | ConvertFrom-Json
    if ($params -and $params.Parameters) {
        foreach ($p in $params.Parameters) {
            $age = ""
            if ($p.LastModifiedDate) {
                $modified = [datetime]$p.LastModifiedDate
                $age = " (modified {0})" -f $modified.ToString("yyyy-MM-dd HH:mm")
            }
            Write-Info ("{0,-40} {1}{2}" -f $p.Name, $p.Type, $age)
        }
    } else {
        Write-Warn "No secrets found at $prefix/ -- run 'deploy' first"
    }

    if (-not $InviteCode) {
        Write-Host ""
        Write-Info "To set invite code: .\cloud-deploy.ps1 secrets -InviteCode 'your-code'"
        Write-Info "To rotate DB password or JWT, update in SSM then redeploy."
    }
}

function Invoke-Schema {
    Write-Header "SCHEMA - apply database migrations to RDS"

    Write-Step "Getting RDS endpoint from Terraform"
    Push-Location $TfDir
    $rdsEndpoint = terraform output -raw rds_endpoint 2>$null
    Pop-Location
    if (-not $rdsEndpoint) { Write-ErrorMsg "Cannot read RDS endpoint. Run 'deploy' first."; return }

    Write-Step "Getting DB password from SSM"
    $prefix = "/academy/$Environment"
    $dbPass = aws ssm get-parameter --name "$prefix/db-password" --with-decryption --query "Parameter.Value" --output text --region $Region 2>$null
    if (-not $dbPass) { Write-ErrorMsg "Cannot read DB password from SSM"; return }

    $schemaFiles = @(
        (Join-Path $ServicesDir "db\001_schema.sql"),
        (Join-Path $ServicesDir "db\002_grader_schema.sql")
    )

    Write-Warn "This will apply schema to RDS at $rdsEndpoint"
    Write-Warn "RDS must be reachable (VPC peering, bastion, or SSM Session Manager)."
    Write-Host ""
    Write-Info "Option A: Use psql directly if you have network access:"
    foreach ($f in $schemaFiles) {
        if (Test-Path $f) {
            $fname = Split-Path $f -Leaf
            Write-Host ("  PGPASSWORD='...' psql -h {0} -U academy -d academy -f {1}" -f $rdsEndpoint, $fname) -ForegroundColor Gray
        }
    }
    Write-Host ""
    Write-Info "Option B: Use a temporary ECS task or Lambda to run migrations."
    Write-Info "Option C: Connect via AWS SSM Session Manager port forwarding:"
    Write-Host ("  aws ssm start-session --target <bastion-instance-id> " +
                "--document-name AWS-StartPortForwardingSessionToRemoteHost " +
                "--parameters host=$rdsEndpoint,portNumber=5432,localPortNumber=15432") -ForegroundColor Gray
    Write-Host ("  Then: psql -h localhost -p 15432 -U academy -d academy") -ForegroundColor Gray

    # Attempt direct psql if available
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlCmd -and $Force) {
        Write-Step "Applying schema via psql (direct connection)"
        foreach ($f in $schemaFiles) {
            if (Test-Path $f) {
                $fname = Split-Path $f -Leaf
                Write-Info "Applying $fname"
                $env:PGPASSWORD = $dbPass
                psql -h $rdsEndpoint -U academy -d academy -v ON_ERROR_STOP=1 -f $f
                $env:PGPASSWORD = ""
                if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "Schema apply failed: $fname"; return }
                Write-Success "$fname applied"
            }
        }
        Write-Success "All schema files applied"
    } elseif ($psqlCmd) {
        Write-Host ""
        Write-Info "psql found. Add -Force to apply directly (requires network access to RDS)."
    }
}

function Invoke-Status {
    Write-Header "STATUS - AWS service overview"

    $acct = Get-AwsAccountId
    if (-not $acct) { Write-ErrorMsg "AWS credentials not configured"; return }
    Write-Info "Account: $acct  Region: $Region  Environment: $Environment"
    Write-Host ""

    # App Runner services
    Write-Step "App Runner Services"
    $svcList = aws apprunner list-services --region $Region --output json 2>$null | ConvertFrom-Json
    $found = 0
    foreach ($svc in $ServiceNames) {
        $match = $svcList.ServiceSummaryList | Where-Object { $_.ServiceName -eq $svc }
        if ($match) {
            $found++
            $info = Get-ServiceInfo $svc
            $status = $info.Service.Status
            $url    = $info.Service.ServiceUrl
            $color  = switch ($status) {
                "RUNNING"          { "Green" }
                "OPERATION_IN_PROGRESS" { "Yellow" }
                "PAUSED"           { "DarkYellow" }
                default            { "Red" }
            }
            Write-Host ("  {0,-20} {1,-25} https://{2}" -f $svc, $status, $url) -ForegroundColor $color
        } else {
            Write-Host ("  {0,-20} NOT DEPLOYED" -f $svc) -ForegroundColor DarkGray
        }
    }
    if ($found -eq 0) { Write-Warn "No Academy services found. Run: .\cloud-deploy.ps1 deploy" }

    # RDS
    Write-Host ""
    Write-Step "RDS PostgreSQL"
    $dbId = "$($Environment)-pg" -replace "^", "academy-"
    $rds = aws rds describe-db-instances --db-instance-identifier $dbId --region $Region --output json 2>$null | ConvertFrom-Json
    if ($rds -and $rds.DBInstances) {
        $db = $rds.DBInstances[0]
        $dbColor = if ($db.DBInstanceStatus -eq "available") { "Green" } else { "Yellow" }
        Write-Host ("  {0,-20} {1,-25} {2} ({3})" -f $dbId, $db.DBInstanceStatus, $db.DBInstanceClass, $db.Engine) -ForegroundColor $dbColor
    } else {
        Write-Host ("  {0,-20} NOT DEPLOYED" -f "RDS") -ForegroundColor DarkGray
    }

    # ElastiCache
    Write-Host ""
    Write-Step "ElastiCache Redis"
    $redisId = "academy-$Environment-redis"
    $redis = aws elasticache describe-replication-groups --replication-group-id $redisId --region $Region --output json 2>$null | ConvertFrom-Json
    if ($redis -and $redis.ReplicationGroups) {
        $rg = $redis.ReplicationGroups[0]
        $rgColor = if ($rg.Status -eq "available") { "Green" } else { "Yellow" }
        Write-Host ("  {0,-20} {1,-25} {2}" -f $redisId, $rg.Status, $rg.CacheNodeType) -ForegroundColor $rgColor
    } else {
        Write-Host ("  {0,-20} NOT DEPLOYED" -f "Redis") -ForegroundColor DarkGray
    }

    # ECR
    Write-Host ""
    Write-Step "ECR Repositories"
    foreach ($svc in $ServiceNames) {
        $ecrName = $EcrRepos[$svc]
        $images = aws ecr describe-images --repository-name $ecrName --region $Region --query "imageDetails | sort_by(@, &imagePushedAt) | [-1]" --output json 2>$null | ConvertFrom-Json
        if ($images) {
            $pushed = if ($images.imagePushedAt) { ([datetime]$images.imagePushedAt).ToString("yyyy-MM-dd HH:mm") } else { "unknown" }
            $tags = if ($images.imageTags) { ($images.imageTags -join ", ") } else { "untagged" }
            Write-Host ("  {0,-35} latest push: {1}  tags: {2}" -f $ecrName, $pushed, $tags) -ForegroundColor Green
        } else {
            Write-Host ("  {0,-35} no images" -f $ecrName) -ForegroundColor DarkGray
        }
    }
}

function Invoke-Health {
    Write-Header "HEALTH - deep health check (HTTP /healthz)"

    $allOk = $true
    foreach ($svc in $ServiceNames) {
        $info = Get-ServiceInfo $svc
        if (-not $info) {
            Write-ErrorMsg "$svc not found"
            $allOk = $false
            continue
        }
        $status = $info.Service.Status
        $url    = $info.Service.ServiceUrl
        if ($status -eq "PAUSED") {
            Write-Warn "$svc is PAUSED -- resume first"
            continue
        }
        if ($status -ne "RUNNING") {
            Write-ErrorMsg "$svc status: $status"
            $allOk = $false
            continue
        }

        try {
            $response = Invoke-WebRequest -Uri "https://$url/healthz" -UseBasicParsing -TimeoutSec 10
            $code = $response.StatusCode
            if ($code -eq 200) {
                Write-Success ("{0,-20} {1}  https://{2}/healthz" -f $svc, $code, $url)
            } else {
                Write-ErrorMsg ("{0,-20} {1}  https://{2}/healthz" -f $svc, $code, $url)
                $allOk = $false
            }
        } catch {
            Write-ErrorMsg ("{0,-20} UNREACHABLE  https://{1}/healthz  ({2})" -f $svc, $url, $_.Exception.Message)
            $allOk = $false
        }
    }

    if ($allOk) { Write-Success "All services healthy" }
    else { Write-ErrorMsg "Some services are unhealthy" }
}

function Invoke-Logs {
    Write-Header "LOGS - tail App Runner logs"

    $target = $Service
    if (-not $target) {
        Write-Info "Available services: $($ServiceNames -join ', ')"
        $target = Read-Host "Which service? [academy-user]"
        if (-not $target) { $target = "academy-user" }
    }

    $arn = Get-ServiceArn $target
    if (-not $arn) { Write-ErrorMsg "Service $target not found"; return }

    Write-Info "Streaming logs for $target (Ctrl+C to stop)"
    Write-Info "ARN: $arn"
    Write-Host ""

    # App Runner logs go to CloudWatch under /aws/apprunner/<service-name>/<instance-id>/application
    $logGroup = "/aws/apprunner/$target"
    Write-Info "Log group: $logGroup"

    # Tail the most recent log streams
    aws logs tail $logGroup --follow --since 5m --region $Region 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "CloudWatch log tailing failed. Try:"
        Write-Host ("  aws logs tail {0} --follow --region {1}" -f $logGroup, $Region) -ForegroundColor Gray
    }
}

function Invoke-Pause {
    Write-Header "PAUSE - stop all services (dollar 0 compute)"

    $paused = 0
    foreach ($svc in $ServiceNames) {
        $arn = Get-ServiceArn $svc
        if (-not $arn) { Write-Warn "$svc not found"; continue }
        $status = aws apprunner describe-service --service-arn $arn --query "Service.Status" --output text --region $Region 2>$null
        if ($status -eq "PAUSED") {
            Write-Info "$svc already paused"
            $paused++
            continue
        }
        if ($status -ne "RUNNING") {
            Write-Warn "$svc status is $status -- skipping"
            continue
        }

        Write-Step "Pausing $svc"
        aws apprunner pause-service --service-arn $arn --region $Region > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$svc pause initiated"
            $paused++
        } else {
            Write-ErrorMsg "Failed to pause $svc"
        }
    }

    Write-Host ""
    if ($paused -eq $ServiceNames.Count) {
        Write-Success "All services pausing. Compute cost: ~dollar 0/mo"
        Write-Info "RDS + Redis free tier still running (dollar 0 for 12 months)"
        Write-Info "Resume with: .\cloud-deploy.ps1 resume"
    } else {
        Write-Warn "Some services could not be paused"
    }
}

function Invoke-Resume {
    Write-Header "RESUME - reactivate paused services"

    $resumed = 0
    foreach ($svc in $ServiceNames) {
        $arn = Get-ServiceArn $svc
        if (-not $arn) { Write-Warn "$svc not found"; continue }
        $status = aws apprunner describe-service --service-arn $arn --query "Service.Status" --output text --region $Region 2>$null
        if ($status -eq "RUNNING") {
            Write-Info "$svc already running"
            $resumed++
            continue
        }
        if ($status -ne "PAUSED") {
            Write-Warn "$svc status is $status -- cannot resume"
            continue
        }

        Write-Step "Resuming $svc"
        aws apprunner resume-service --service-arn $arn --region $Region > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$svc resume initiated"
            $resumed++
        } else {
            Write-ErrorMsg "Failed to resume $svc"
        }
    }

    if ($resumed -gt 0) {
        Write-Host ""
        Write-Step "Waiting for services to start (this takes 1-3 minutes)"
        foreach ($svc in $ServiceNames) {
            $arn = Get-ServiceArn $svc
            if (-not $arn) { continue }
            $attempts = 0
            while ($attempts -lt 24) {  # 24 x 15s = 6 minutes
                $status = aws apprunner describe-service --service-arn $arn --query "Service.Status" --output text --region $Region 2>$null
                if ($status -eq "RUNNING") { Write-Success "$svc is RUNNING"; break }
                if ($status -match "FAILED") { Write-ErrorMsg "$svc FAILED"; break }
                $attempts++
                Start-Sleep -Seconds 15
            }
        }
        Write-Host ""
        Write-Info "Run: .\cloud-deploy.ps1 health"
    }
}

function Invoke-Cost {
    Write-Header "COST - estimated monthly spend"

    $runningCount = 0
    $pausedCount  = 0

    foreach ($svc in $ServiceNames) {
        $arn = Get-ServiceArn $svc
        if (-not $arn) { continue }
        $status = aws apprunner describe-service --service-arn $arn --query "Service.Status" --output text --region $Region 2>$null
        if ($status -eq "RUNNING") { $runningCount++ }
        elseif ($status -eq "PAUSED") { $pausedCount++ }
    }

    # Provisioned cost: $0.007/GB-hr * 0.5 GB * 730 hrs = $2.555/service/mo
    $provisionedPerService = 2.56
    $computeCost = $runningCount * $provisionedPerService
    $notDeployed = $ServiceNames.Count - $runningCount - $pausedCount

    Write-Host ""
    Write-Host "  Component              Status           Est. Monthly" -ForegroundColor White
    Write-Host "  ---------              ------           -----------" -ForegroundColor DarkGray
    Write-Host ("  App Runner ({0} running) {1,-16} ~dollar {2:F2}" -f $runningCount, "", $computeCost) -ForegroundColor $(if ($runningCount -gt 0) { "Yellow" } else { "Green" })
    Write-Host ("  App Runner ({0} paused)  {1,-16} dollar 0.00" -f $pausedCount, "") -ForegroundColor Green
    Write-Host ("  RDS PostgreSQL         free tier        dollar 0.00") -ForegroundColor Green
    Write-Host ("  ElastiCache Redis      free tier        dollar 0.00") -ForegroundColor Green
    Write-Host ("  ECR (images)           500 MB free      dollar 0.00") -ForegroundColor Green
    Write-Host ("  SSM Parameter Store    free             dollar 0.00") -ForegroundColor Green
    Write-Host "  ---------              ------           -----------" -ForegroundColor DarkGray
    Write-Host ("  TOTAL                                   ~dollar {0:F2}/mo" -f $computeCost) -ForegroundColor $(if ($computeCost -gt 0) { "Yellow" } else { "Green" })
    Write-Host ""
    if ($runningCount -gt 0) {
        Write-Info "Pause services to reduce to dollar 0: .\cloud-deploy.ps1 pause"
    }
    if ($notDeployed -gt 0) {
        Write-Info "$notDeployed service(s) not yet deployed"
    }
    Write-Info "Free tier covers RDS + Redis for 12 months from account creation."
    Write-Info "After free tier: RDS ~dollar 13/mo, Redis ~dollar 12/mo."
}

function Invoke-Urls {
    Write-Header "URLS - service endpoints for frontend config"

    Write-Host ""
    foreach ($svc in $ServiceNames) {
        $info = Get-ServiceInfo $svc
        if ($info) {
            $status = $info.Service.Status
            $url    = $info.Service.ServiceUrl
            $label  = switch ($svc) {
                "academy-user"     { "NEXT_PUBLIC_USER_API" }
                "academy-progress" { "NEXT_PUBLIC_PROGRESS_API" }
                "academy-grader"   { "NEXT_PUBLIC_GRADER_API" }
            }
            if ($status -eq "RUNNING") {
                Write-Host ("  {0}=https://{1}" -f $label, $url) -ForegroundColor Green
            } elseif ($status -eq "PAUSED") {
                Write-Host ("  {0}=https://{1}  (PAUSED)" -f $label, $url) -ForegroundColor DarkYellow
            } else {
                Write-Host ("  {0}=https://{1}  ({2})" -f $label, $url, $status) -ForegroundColor Red
            }
        } else {
            Write-Host ("  {0,-20} NOT DEPLOYED" -f $svc) -ForegroundColor DarkGray
        }
    }

    Write-Host ""
    Write-Info "Add these to your frontend .env.local file."
    Write-Info "Health endpoints: <url>/healthz"
    Write-Info "API docs (dev only): <url>/docs"
}

function Invoke-Destroy {
    Write-Header "DESTROY - tear down ALL AWS resources"

    Write-Host ""
    Write-Warn "This will PERMANENTLY DELETE:"
    Write-Warn "  - All 3 App Runner services"
    Write-Warn "  - RDS PostgreSQL database (ALL DATA)"
    Write-Warn "  - ElastiCache Redis"
    Write-Warn "  - ECR repositories and images"
    Write-Warn "  - VPC, security groups, IAM roles"
    Write-Warn "  - SSM secrets"
    Write-Host ""

    if (-not $Force) {
        $confirm = Read-Host "Type 'destroy-academy' to confirm"
        if ($confirm -ne "destroy-academy") {
            Write-Info "Aborted. No resources were destroyed."
            return
        }
    }

    Write-Step "Running terraform destroy"
    $exitCode = Invoke-TfCommand @("destroy", "-auto-approve")
    if ($exitCode -eq 0) {
        Write-Success "All AWS resources destroyed"
    } else {
        Write-ErrorMsg "Terraform destroy failed. Some resources may remain."
        Write-Info "Check the AWS Console for orphaned resources."
    }
}

function Show-Help {
    Write-Header "VRISHI ACADEMY - AWS CLOUD DEPLOYMENT"
    Write-Host ""
    Write-Host "  Setup & Provision:" -ForegroundColor White
    Write-Host "    .\cloud-deploy.ps1 preflight     Verify AWS CLI, Terraform, Docker"
    Write-Host "    .\cloud-deploy.ps1 init          Terraform init (first time)"
    Write-Host "    .\cloud-deploy.ps1 plan          Preview infrastructure changes"
    Write-Host "    .\cloud-deploy.ps1 deploy        Full deploy (infra + images + activate)"
    Write-Host ""
    Write-Host "  Update & Release:" -ForegroundColor White
    Write-Host "    .\cloud-deploy.ps1 push          Build + push images to ECR"
    Write-Host "    .\cloud-deploy.ps1 redeploy      Push images + restart services"
    Write-Host "    .\cloud-deploy.ps1 secrets       View/set SSM secrets (-InviteCode)"
    Write-Host "    .\cloud-deploy.ps1 schema        Apply DB schema to RDS"
    Write-Host ""
    Write-Host "  Monitor & Operate:" -ForegroundColor White
    Write-Host "    .\cloud-deploy.ps1 status        Full infrastructure overview"
    Write-Host "    .\cloud-deploy.ps1 health        HTTP health checks on all services"
    Write-Host "    .\cloud-deploy.ps1 logs          Tail service logs (-Service name)"
    Write-Host "    .\cloud-deploy.ps1 urls          Print API URLs for frontend config"
    Write-Host "    .\cloud-deploy.ps1 cost          Estimated monthly spend"
    Write-Host ""
    Write-Host "  Cost Management:" -ForegroundColor White
    Write-Host "    .\cloud-deploy.ps1 pause         Pause all services (dollar 0)"
    Write-Host "    .\cloud-deploy.ps1 resume        Resume paused services"
    Write-Host ""
    Write-Host "  Teardown:" -ForegroundColor White
    Write-Host "    .\cloud-deploy.ps1 destroy       Delete all resources (-Force to skip prompt)"
    Write-Host ""
    Write-Host "  First-time:  preflight -> init -> deploy -> secrets -InviteCode 'x' -> schema" -ForegroundColor Gray
    Write-Host "  Daily:       resume -> (practice) -> pause" -ForegroundColor Gray
    Write-Host "  Code change: redeploy" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Options:" -ForegroundColor White
    Write-Host "    -Region us-east-1          AWS region (default: us-east-1)"
    Write-Host "    -Environment production    Environment name (default: production)"
    Write-Host "    -GitHubOrg your-org        GitHub org for OIDC (deploy mode)"
    Write-Host "    -GitHubRepo your-repo      GitHub repo for OIDC (deploy mode)"
    Write-Host "    -InviteCode 'code'         Set invite code (secrets mode)"
    Write-Host "    -Service academy-user      Target service (logs mode)"
    Write-Host "    -Force                     Skip confirmations"
}

# ---------------------------------------------------------------- dispatch ---
switch ($Mode) {
    "preflight" { Invoke-Preflight }
    "init"      { Invoke-Init }
    "plan"      { Invoke-Plan }
    "deploy"    { Invoke-Deploy }
    "push"      { Invoke-Push }
    "redeploy"  { Invoke-Redeploy }
    "secrets"   { Invoke-Secrets }
    "schema"    { Invoke-Schema }
    "status"    { Invoke-Status }
    "health"    { Invoke-Health }
    "logs"      { Invoke-Logs }
    "pause"     { Invoke-Pause }
    "resume"    { Invoke-Resume }
    "cost"      { Invoke-Cost }
    "urls"      { Invoke-Urls }
    "destroy"   { Invoke-Destroy }
    default     { Show-Help }
}
