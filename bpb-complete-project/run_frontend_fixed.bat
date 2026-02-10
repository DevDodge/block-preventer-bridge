@echo off
echo Starting Block Preventer Bridge Frontend on Port 3045...
cd "bpb-frontend"
call pnpm dev --port 3045
pause
