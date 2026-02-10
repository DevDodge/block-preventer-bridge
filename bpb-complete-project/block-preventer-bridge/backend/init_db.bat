@echo off
REM ========================================
REM Database Initialization Script for Windows
REM ========================================

echo.
echo ========================================
echo   Initializing Database Tables
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://www.python.org/
    pause
    exit /b 1
)

REM Activate virtual environment if exists
if exist "venv" (
    echo [INFO] Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo [WARNING] Virtual environment not found. Using system Python.
)

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo Please create .env file with your database credentials
    pause
    exit /b 1
)

REM Run the initialization script
echo.
echo [INFO] Running database initialization...
python init_db.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Database initialization failed!
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Database initialized successfully!
echo.
pause
