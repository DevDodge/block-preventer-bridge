import asyncio
import logging
import os
import sys
from urllib.parse import urlparse

# Add current directory to path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def create_database_if_not_exists(db_url):
    """
    Connect to the default 'postgres' database and create the target database if it doesn't exist.
    """
    try:
        import asyncpg
        
        # Parse connection details
        parsed = urlparse(db_url)
        username = parsed.username
        password = parsed.password
        hostname = parsed.hostname
        port = parsed.port or 5432
        db_name = parsed.path.lstrip('/')
        
        # Connection string to 'postgres' database
        postgres_url = f"postgresql://{username}:{password}@{hostname}:{port}/postgres"
        
        logger.info(f"Checking if database '{db_name}' exists...")
        
        try:
            conn = await asyncpg.connect(postgres_url)
            try:
                # Check if database exists
                exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", db_name)
                
                if not exists:
                    logger.info(f"Database '{db_name}' does not exist. Creating...")
                    await conn.execute(f'CREATE DATABASE "{db_name}"')
                    logger.info(f"Database '{db_name}' created successfully.")
                else:
                    logger.info(f"Database '{db_name}' already exists.")
            finally:
                await conn.close()
                
            return True
        except Exception as e:
             logger.error(f"Failed to connect to postgres database: {e}")
             return False

    except ImportError:
        logger.error("asyncpg driver not installed. Please run: pip install asyncpg")
        return False
    except Exception as e:
        logger.error(f"Error checking/creating database: {e}")
        return False

async def init_tables():
    """
    Initialize all database tables using SQLAlchemy models.
    """
    try:
        # Load environment first
        from dotenv import load_dotenv
        load_dotenv()
        
        from app.config.settings import settings
        from app.models.database import engine, Base
        # Import all models to ensure they are registered with Base.metadata
        from app.models import models
        from sqlalchemy import text
        
        logger.info(f"Connecting to database: {settings.DATABASE_URL.split('@')[-1]}")
        
        async with engine.begin() as conn:
            logger.info("Creating tables...")
            await conn.run_sync(Base.metadata.create_all)
            
            # Run additional raw SQL migrations if needed
            logger.info("Running additional migrations...")
            await conn.execute(
                text("ALTER TABLE packages ADD COLUMN IF NOT EXISTS auto_adjust_interval_minutes INTEGER DEFAULT 360")
            )
            try:
                await conn.execute(
                    text("ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS message_content_display VARCHAR(10) DEFAULT 'hover'")
                )
            except Exception as e:
                logger.warning(f"Note on migration: {e}")

        logger.info("Database tables verified/created successfully.")
        return True
    except Exception as e:
        logger.error(f"Error initializing tables: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    # Load environment variables
    from dotenv import load_dotenv
    if os.path.exists(".env"):
        load_dotenv()
    else:
        logger.warning("No .env file found. Using environment variables.")
    
    from app.config.settings import settings
    
    # 1. Create database if it doesn't exist
    # SQLAlchemy URL: postgresql+asyncpg://...
    # We need: postgresql://...
    
    db_url = settings.DATABASE_URL.replace('+asyncpg', '')
    
    if await create_database_if_not_exists(db_url):
        # 2. Initialize tables
        await init_tables()
    else:
        logger.info("Proceeding to table initialization anyway (assuming DB exists)...")
        await init_tables()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(main())
