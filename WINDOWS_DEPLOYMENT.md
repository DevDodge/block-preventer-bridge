# Windows Server Deployment Guide

This guide provides instructions for deploying and running the **Bodyguard** application on a Windows Server environment.

## Prerequisites

Before you begin, ensure you have the following installed on your server:

1.  **Python**: Version 3.11 or higher. [Download Python](https://www.python.org/downloads/)
    - During installation, make sure to check **"Add Python to PATH"**.
2.  **Node.js**: Version 18 or higher. [Download Node.js](https://nodejs.org/)
3.  **Git**: For cloning the project. [Download Git](https://git-scm.com/downloads/)
4.  **PostgreSQL**: The database for the application. [Download PostgreSQL](https://www.postgresql.org/download/)

## 1. Clone the Project

Open Command Prompt (`cmd`) and clone the project from GitHub:

```bash
git clone https://github.com/DevDodge/block-preventer-bridge.git
cd block-preventer-bridge
```

## 2. Backend Setup

Navigate to the backend directory:

```bash
cd bpb-complete-project\block-preventer-bridge\backend
```

### Configure Database

1.  Create a `.env` file by copying the example:
    ```bash
    copy .env.example .env
    ```
2.  Edit the `.env` file with your PostgreSQL database credentials:

    ```ini
    DATABASE_TYPE=postgres
    DATABASE_PORT=5432
    DATABASE_HOST=localhost
    DATABASE_USER=your_db_user
    DATABASE_PASSWORD=your_db_password
    DATABASE_DB=block_preventer_bridge
    ```

### Run Backend

Simply double-click the `start-backend.bat` file. It will automatically:

- Create a Python virtual environment (`venv`)
- Install all required dependencies from `requirements.txt`
- Start the backend server at `http://localhost:8000`

## 3. Frontend Setup

Navigate to the frontend directory:

```bash
cd ..\..\bpb-frontend
```

### Run Frontend (Development Mode)

Double-click the `start-frontend.bat` file. It will:

- Install `pnpm` if not already installed
- Install all Node.js dependencies
- Start the Vite development server at `http://localhost:3000`

### Build for Production

For a production deployment, you should build the frontend first:

1.  Double-click `build-frontend.bat`. This will create a `dist` folder with the optimized production build.
2.  Double-click `start-frontend-production.bat` to run the optimized production server.

## 4. Running the Full Application

To start both the backend and frontend servers simultaneously, go to the root directory of the project (`block-preventer-bridge`) and double-click `start-all.bat`.

This will open two separate Command Prompt windows for the backend and frontend.

## 5. Stopping the Application

To stop all running servers, double-click `stop-all.bat` in the root directory. This will terminate all related Python and Node.js processes.

## Summary of Scripts

| File | Location | Description |
|---|---|---|
| `start-all.bat` | Root | Starts both backend and frontend servers. |
| `stop-all.bat` | Root | Stops all running servers. |
| `start-backend.bat` | `backend` | Starts the backend server in development mode. |
| `start-frontend.bat` | `frontend` | Starts the frontend server in development mode. |
| `build-frontend.bat`| `frontend` | Builds the frontend for production. |
| `start-frontend-production.bat` | `frontend` | Starts the frontend server in production mode. |
