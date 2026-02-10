@echo off
REM ========================================
REM Database Sync Script (Remote -> Local)
REM ========================================

echo.
echo ========================================
echo   Syncing Remote Database to Local
echo ========================================
echo.
echo [WARNING] This will OVERWRITE your local database!
echo.
timeout /t 5

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Activate virtual environment if exists
if exist "venv" (
    echo [INFO] Activating virtual environment...
    call venv\Scripts\activate.bat
)

REM Run the sync script
python sync_db.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Synchronization failed!
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Synchronization complete!
echo.
pause
