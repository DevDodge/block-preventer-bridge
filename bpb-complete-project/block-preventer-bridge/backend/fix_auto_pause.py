#!/usr/bin/env python3
"""
Migration script to disable auto_pause_on_failures for all existing packages.

This script updates all packages in the database to set auto_pause_on_failures = False,
which is the new default behavior for production.

Usage:
    python fix_auto_pause.py
"""

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import models
import sys
sys.path.insert(0, os.path.dirname(__file__))
from app.models.models import Package

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found in environment variables")
    print("Please create a .env file with DATABASE_URL")
    sys.exit(1)

async def fix_auto_pause():
    """Update all packages to disable auto_pause_on_failures."""
    print("🔧 Starting migration: Disabling auto_pause_on_failures for all packages...")
    
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get all packages
        result = await session.execute(select(Package))
        packages = result.scalars().all()
        
        if not packages:
            print("ℹ️  No packages found in database")
            return
        
        print(f"📦 Found {len(packages)} package(s)")
        
        updated_count = 0
        for package in packages:
            if package.auto_pause_on_failures:
                print(f"  ⚙️  Updating package: {package.name} (ID: {package.id})")
                package.auto_pause_on_failures = False
                updated_count += 1
            else:
                print(f"  ✅ Package already updated: {package.name} (ID: {package.id})")
        
        if updated_count > 0:
            await session.commit()
            print(f"\n✅ Successfully updated {updated_count} package(s)")
        else:
            print(f"\n✅ All packages already have auto_pause_on_failures = False")
        
        # Also resume any paused profiles
        print("\n🔄 Checking for auto-paused profiles...")
        from app.models.models import Profile
        
        result = await session.execute(
            select(Profile).where(Profile.status == "paused")
        )
        paused_profiles = result.scalars().all()
        
        if paused_profiles:
            print(f"📋 Found {len(paused_profiles)} paused profile(s)")
            resume_count = 0
            for profile in paused_profiles:
                if profile.pause_reason and "Auto-paused" in profile.pause_reason:
                    print(f"  🔓 Resuming profile: {profile.name} (ID: {profile.id})")
                    profile.status = "active"
                    profile.pause_reason = None
                    profile.resume_at = None
                    resume_count += 1
            
            if resume_count > 0:
                await session.commit()
                print(f"\n✅ Successfully resumed {resume_count} auto-paused profile(s)")
        else:
            print("ℹ️  No paused profiles found")
    
    await engine.dispose()
    print("\n🎉 Migration completed successfully!")
    print("\n📝 Next steps:")
    print("  1. Restart your backend server")
    print("  2. Check the Alerts page to mark old alerts as read")
    print("  3. Try sending messages again")

if __name__ == "__main__":
    asyncio.run(fix_auto_pause())
