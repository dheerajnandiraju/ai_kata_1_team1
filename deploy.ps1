# ===========================================
# Office Supply Management System - Deployer
# PowerShell Script for Windows
# ===========================================

param(
    [Parameter(Position=0)]
    [ValidateSet("up", "start", "down", "stop", "restart", "build", "status", "logs", "health", "clean", "help")]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$Service = ""
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }

function Show-Header {
    Write-Host "============================================" -ForegroundColor Blue
    Write-Host "  OSMS Deployment Agent" -ForegroundColor Blue
    Write-Host "============================================" -ForegroundColor Blue
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check Docker
    try {
        docker --version | Out-Null
        Write-Success "Docker found"
    } catch {
        Write-Error "Docker is not installed"
        exit 1
    }
    
    # Check Docker Compose
    try {
        docker compose version | Out-Null
        Write-Success "Docker Compose found"
    } catch {
        Write-Error "Docker Compose is not installed"
        exit 1
    }
    
    # Check .env file
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found, creating..."
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Success "Created .env from .env.example"
        } else {
            @"
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
"@ | Out-File -FilePath ".env" -Encoding UTF8
            Write-Success "Created default .env file"
        }
    }
    Write-Success ".env file exists"
}

function Build-Images {
    Write-Info "Building Docker images..."
    docker compose build --no-cache
    Write-Success "Images built successfully"
}

function Start-Services {
    Write-Info "Starting services..."
    docker compose up -d
    Write-Success "Services started"
}

function Stop-Services {
    Write-Info "Stopping services..."
    docker compose down
    Write-Success "Services stopped"
}

function Restart-Services {
    Stop-Services
    Start-Services
}

function Show-Status {
    Write-Info "Service Status:"
    docker compose ps
}

function Show-Logs {
    param([string]$ServiceName)
    if ([string]::IsNullOrEmpty($ServiceName)) {
        docker compose logs -f
    } else {
        docker compose logs -f $ServiceName
    }
}

function Test-Health {
    Write-Info "Running health checks..."
    
    Write-Host ""
    Write-Info "MongoDB:"
    try {
        docker compose exec -T mongo mongosh --eval "db.runCommand('ping')" 2>$null
        Write-Success "MongoDB is healthy"
    } catch {
        Write-Error "MongoDB is not responding"
    }
    
    Write-Host ""
    Write-Info "Server (http://localhost:3001):"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        Write-Success "Server is healthy"
    } catch {
        Write-Warning "Server may not be ready yet"
    }
    
    Write-Host ""
    Write-Info "Client (http://localhost:80):"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:80" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        Write-Success "Client is healthy"
    } catch {
        Write-Warning "Client may not be ready yet"
    }
}

function Invoke-CleanDeploy {
    Write-Warning "This will remove all containers and volumes!"
    $confirmation = Read-Host "Are you sure? (y/N)"
    if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
        Write-Info "Cleaning up..."
        docker compose down -v --remove-orphans
        docker system prune -f
        Write-Success "Cleanup complete"
        
        Write-Info "Rebuilding..."
        Build-Images
        Start-Services
        Write-Success "Clean deployment complete"
    }
}

function Show-Help {
    Write-Host @"
Usage: .\deploy.ps1 [command] [service]

Commands:
  up, start       Build and start all services
  down, stop      Stop all services
  restart         Restart all services
  build           Build Docker images
  status          Show service status
  logs [service]  Show logs (optionally for specific service)
  health          Run health checks
  clean           Clean rebuild (removes volumes)
  help            Show this help message

Services: mongo, server, client

Examples:
  .\deploy.ps1 up
  .\deploy.ps1 logs server
  .\deploy.ps1 health
"@
}

# Main
Show-Header

switch ($Command) {
    { $_ -in "up", "start" } {
        Test-Prerequisites
        Build-Images
        Start-Services
        Write-Host ""
        Write-Success "🚀 Deployment complete!"
        Write-Host ""
        Write-Host "  Server: http://localhost:3001"
        Write-Host "  Client: http://localhost:80"
        Write-Host "  MongoDB: localhost:27017"
        Write-Host ""
        Write-Host "Run '.\deploy.ps1 logs' to monitor services"
    }
    { $_ -in "down", "stop" } {
        Stop-Services
    }
    "restart" {
        Restart-Services
    }
    "build" {
        Test-Prerequisites
        Build-Images
    }
    "status" {
        Show-Status
    }
    "logs" {
        Show-Logs -ServiceName $Service
    }
    "health" {
        Test-Health
    }
    "clean" {
        Invoke-CleanDeploy
    }
    default {
        Show-Help
    }
}
