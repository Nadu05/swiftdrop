<#
.SYNOPSIS
    SwiftDrop - Container Management Script for Windows PowerShell
.DESCRIPTION
    Usage: .\swiftdrop.ps1 <action> [target] [--mvn] [--no-cache]
#>

param(
    [Parameter(Position=0)]
    [string]$Action = "status",
    
    [Parameter(Position=1)]
    [string]$Target = "all",

    [switch]$mvn,
    [switch]$noCache
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Invoke-DC { docker compose -f docker-compose.yml @args }

function Write-Info($msg) { Write-Host "==> $msg" -ForegroundColor Blue }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Err($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

# Map targets
$services = switch ($Target) {
    "all"      { @("rabbitmq", "identity-service", "organization-service", "order-service", "dispatch-service", "notification-service", "api-gateway", "frontend") }
    "backend"  { @("identity-service", "organization-service", "order-service", "dispatch-service", "notification-service", "api-gateway") }
    "frontend" { @("frontend") }
    "infra"    { @("rabbitmq") }
    default    { @($Target) }
}

# Handle Maven build if requested
if ($mvn) {
    Write-Info "Running Maven build package..."
    foreach ($svc in $services) {
        if ($svc -match "-service") {
            $path = "../services/$svc"
            if (Test-Path "$path/mvnw.cmd") {
                Write-Info "Building $svc using mvnw..."
                Push-Location $path
                & .\mvnw.cmd clean package -DskipTests
                Pop-Location
            }
        }
    }
}

# Execute Docker Compose actions
switch ($Action) {
    "start" {
        Write-Info "Starting containers..."
        Invoke-DC up -d $services
        Write-Ok "Containers started."
    }
    "stop" {
        Write-Info "Stopping containers..."
        Invoke-DC stop $services
        Write-Ok "Containers stopped."
    }
    "restart" {
        Write-Info "Restarting containers..."
        Invoke-DC restart $services
        Write-Ok "Containers restarted."
    }
    "rebuild" {
        Write-Info "Building and re-creating containers..."
        $buildArgs = @("build")
        if ($noCache) { $buildArgs += "--no-cache" }
        Invoke-DC @buildArgs $services
        Invoke-DC up -d --force-recreate --no-deps $services
        Write-Ok "Rebuilt and restarted."
    }
    "status" {
        Invoke-DC ps -a
    }
    "logs" {
        Invoke-DC logs -f --tail=100 $services
    }
    "down" {
        Invoke-DC down
        Write-Ok "Environment torn down."
    }
    default {
        Write-Host "Unknown action: $Action" -ForegroundColor Yellow
        Write-Host "Available actions: start, stop, restart, rebuild, status, logs, down"
    }
}