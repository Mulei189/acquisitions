@echo off
REM Docker Setup Script for Acquisitions API (Windows)
REM This script helps set up Docker environment for development and production

setlocal enabledelayedexpansion

cls
echo.
echo ========================================
echo Acquisitions API - Docker Setup (Windows)
echo ========================================
echo.

REM Check Docker installation
echo Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not in PATH.
    echo Please install Docker Desktop for Windows.
    pause
    exit /b 1
)
echo ✓ Docker is installed
echo.

REM Check Docker Compose installation
echo Checking Docker Compose installation...
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Compose is not installed.
    pause
    exit /b 1
)
echo ✓ Docker Compose is installed
echo.

REM Menu
echo Select setup type:
echo 1) Development (Neon Local + App)
echo 2) Production (Neon Cloud + App)
echo 3) Build Docker Image Only
echo 4) Clean Up (Stop and Remove Containers)
echo.
set /p choice="Enter choice [1-4]: "

if "%choice%"=="1" goto dev_setup
if "%choice%"=="2" goto prod_setup
if "%choice%"=="3" goto build_only
if "%choice%"=="4" goto cleanup
echo Invalid choice
pause
exit /b 1

:dev_setup
cls
echo.
echo Setting up Development Environment...
echo.

if not exist ".env.development" (
    echo Creating .env.development from template...
    if exist ".env.development" (
        copy ".env.development" ".env.development" >nul
    ) else (
        echo .env.development template not found - please create it
    )
)

echo Starting Neon Local and Application...
docker-compose -f docker-compose.dev.yml up -d --build

if errorlevel 1 (
    echo ERROR: Failed to start development environment
    pause
    exit /b 1
)

echo.
echo ✓ Development environment is running!
echo   Application: http://localhost:3000
echo   Database: postgres://postgres:postgres@localhost:5432/neon
echo.
echo Waiting for services to be healthy (30 seconds)...
timeout /t 30 /nobreak

echo.
echo Checking health...
curl -s http://localhost:3000/health 2>nul || (
    echo Health check in progress...
)

echo.
echo Setup complete!
echo Run migrations: docker-compose -f docker-compose.dev.yml exec app npm run db:migrate
echo.
pause
exit /b 0

:prod_setup
cls
echo.
echo Setting up Production Environment...
echo.

if not exist ".env.production" (
    echo ERROR: .env.production file not found!
    echo Please create .env.production with your Neon Cloud connection string.
    echo Use .env.production.example as a template.
    echo.
    pause
    exit /b 1
)

echo Building Production Docker Image...
docker build -t acquisitions-app:prod .

if errorlevel 1 (
    echo ERROR: Failed to build Docker image
    pause
    exit /b 1
)

echo.
echo Starting Production Container...
docker-compose -f docker-compose.prod.yml up -d --build

if errorlevel 1 (
    echo ERROR: Failed to start production environment
    pause
    exit /b 1
)

echo.
echo ✓ Production environment is running!
echo   Application: http://localhost:3000
echo.
echo Running migrations...
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate

echo.
echo Setup complete!
echo.
pause
exit /b 0

:build_only
cls
echo.
echo Building Docker Image...
docker build -t acquisitions-app:latest .

if errorlevel 1 (
    echo ERROR: Failed to build Docker image
    pause
    exit /b 1
)

echo.
echo ✓ Docker image built successfully!
echo.
pause
exit /b 0

:cleanup
cls
echo.
echo Cleaning up containers...
echo.

set /p dev_cleanup="Remove development containers? (y/n): "
if /i "%dev_cleanup%"=="y" (
    docker-compose -f docker-compose.dev.yml down -v
    echo ✓ Development containers removed
)

echo.

set /p prod_cleanup="Remove production containers? (y/n): "
if /i "%prod_cleanup%"=="y" (
    docker-compose -f docker-compose.prod.yml down
    echo ✓ Production containers removed
)

echo.
echo Cleanup complete!
echo.
pause
exit /b 0
