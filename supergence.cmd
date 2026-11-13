@echo off
REM ==============================================================================
REM Supergence — 1-Command Universal Launcher for Windows CMD
REM ==============================================================================
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo.
  echo [ERROR] Node.js was not found on your system.
  echo Please install Node.js 20 or higher from: https://nodejs.org
  echo.
  pause
  exit /b 1
)

node bin\supergence.mjs %*
