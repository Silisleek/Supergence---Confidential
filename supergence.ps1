# ==============================================================================
# Supergence — 1-Command Universal Launcher for Windows PowerShell
# ==============================================================================
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "`n[ERROR] Node.js was not found on your system." -ForegroundColor Red
    Write-Host "Please install Node.js 20 or higher from: https://nodejs.org`n" -ForegroundColor Yellow
    exit 1
}

node bin\supergence.mjs $args
