@echo off
echo Starting Block Preventer Bridge Backend on Port 8001...
cd "block-preventer-bridge\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
pause
