@echo off
REM ========================================
REM Start Complete Application (Backend + Frontend)
REM ========================================

echo.
echo ========================================
echo   Starting Complete Application
echo ========================================
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Start Backend in new window
echo [INFO] Starting Backend Server...
start "Backend Server" cmd /k "cd /d "%SCRIPT_DIR%bpb-complete-project\block-preventer-bridge\backend" && start-backend.bat"

REM Wait 5 seconds for backend to start
echo [INFO] Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Start Frontend in new window
echo [INFO] Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d "%SCRIPT_DIR%bpb-complete-project\bpb-frontend" && start-frontend.bat"

echo.
echo [SUCCESS] Both servers are starting in separate windows
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Close the server windows to stop the application
echo.
pause
