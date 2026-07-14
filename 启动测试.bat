@echo off
cd /d "%~dp0"

echo Starting KY local server (root: %cd%)
echo.

REM Use py launcher (Python 3)
py -m http.server 8000 >nul 2>&1
if %errorlevel% equ 0 (
    echo Found Python 3 via py launcher
    echo Open http://localhost:8000/  (KY index - src module test)
    echo Press Ctrl+C to stop
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8000/
    py -m http.server 8000
    exit /b 0
)

REM Fallback: check if PHP is available
php --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Found PHP
    echo Open http://localhost:8000/
    echo Press Ctrl+C to stop
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8000/
    php -S localhost:8000
    exit /b 0
)

REM Fallback: check if Node.js is available
where npx >nul 2>&1
if %errorlevel% equ 0 (
    echo Found Node.js
    echo Open http://localhost:8000/
    echo Press Ctrl+C to stop
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8000/
    npx --yes http-server -p 8000
    exit /b 0
)

echo Error: No server found
echo Please install Python (py launcher), PHP, or Node.js
pause
exit /b 1
