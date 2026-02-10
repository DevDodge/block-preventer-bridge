@echo off
REM ========================================
REM Stop All Servers (Backend + Frontend)
REM ========================================

echo.
echo ========================================
echo   Stopping All Servers
echo ========================================
echo.

REM Kill all Python processes (Backend)
echo [INFO] Stopping Backend (Python/Uvicorn)...
taskkill /F /IM python.exe /T >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Backend stopped
) else (
    echo [INFO] No backend process found
)

REM Kill all Node processes (Frontend)
echo [INFO] Stopping Frontend (Node/Vite)...
taskkill /F /IM node.exe /T >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Frontend stopped
) else (
    echo [INFO] No frontend process found
)

echo.
echo [SUCCESS] All servers stopped
echo.
pause
