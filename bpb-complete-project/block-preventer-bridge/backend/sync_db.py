import os
import sys
import subprocess
import shutil
from datetime import datetime
from dotenv import load_dotenv

def log(message):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def error(message):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] [ERROR] {message}")
    sys.exit(1)

def main():
    log("Starting database synchronization...")
    
    # Load .env file
    if os.path.exists(".env"):
        load_dotenv()
    else:
        log("No .env file found. Proceeding with environment variables.")

    # Get database URLs
    remote_url = os.getenv("DATABASE_URL")
    local_url = os.getenv("DATABASE_URL_LOCAL")

    if not remote_url:
        error("DATABASE_URL (remote) is missing in .env")
    
    if not local_url:
        # Default local URL if not specified
        local_url = "postgresql://postgres:password@localhost:5432/block_preventer_bridge"
        log(f"DATABASE_URL_LOCAL not set. Using default: {local_url}")

    # Check for required tools
    pg_dump = shutil.which("pg_dump")
    psql = shutil.which("psql")

    if not pg_dump:
        error("pg_dump not found in PATH. Please install PostgreSQL tools.")
    if not psql:
        error("psql not found in PATH. Please install PostgreSQL tools.")

    log(f"Using pg_dump: {pg_dump}")
    log(f"Using psql: {psql}")

    # Backup remote database
    backup_file = f"remote_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    log(f"Dumping remote database to {backup_file}...")
    
    try:
        # Note: We use the sync connection string format (postgresql://)
        # If the URL is async (postgresql+asyncpg://), we need to fix it for pg_dump
        dump_url = remote_url.replace("+asyncpg", "")
        
        # Run pg_dump
        cmd = [pg_dump, dump_url, "-f", backup_file, "--no-owner", "--no-acl"]
        subprocess.run(cmd, check=True)
        log("Remote database dump successful.")
    except subprocess.CalledProcessError as e:
        error(f"Failed to dump remote database: {e}")
    except Exception as e:
        error(f"Unexpected error during dump: {e}")

    # Restore to local database
    log(f"Restoring to local database: {local_url.split('@')[-1]}...")
    
    try:
        restore_url = local_url.replace("+asyncpg", "")
        
        # Warning: This will overwrite data appropriately
        # Ideally, we drop and recreate, or clean tables
        
        # Option 1: Drop and recreate database (requires connection to postgres db)
        # Option 2: Clean tables (using psql commands)
        
        log("Cleaning local database schemas...")
        clean_cmd = [psql, restore_url, "-c", "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"]
        subprocess.run(clean_cmd, check=True)
        
        log("Importing data...")
        import_cmd = [psql, restore_url, "-f", backup_file]
        subprocess.run(import_cmd, check=True)
        
        log("Database restore successful.")
        
    except subprocess.CalledProcessError as e:
        error(f"Failed to restore database: {e}")
    finally:
        # Cleanup
        if os.path.exists(backup_file):
             log(f"Keeping backup file: {backup_file}")
             # os.remove(backup_file) # Uncomment to delete

    log("Synchronization complete!")

if __name__ == "__main__":
    main()
