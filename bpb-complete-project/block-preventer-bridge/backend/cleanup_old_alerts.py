#!/usr/bin/env python3
"""
Cleanup script to delete old duplicate alerts from the database.

This script removes:
1. Duplicate alerts (same type, profile, within 1 hour)
2. Old alerts (older than specified days)
3. Read alerts (optionally)

Usage:
    python cleanup_old_alerts.py [--days 7] [--delete-read] [--dry-run]
"""

import asyncio
import os
import argparse
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, delete, func
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import models
import sys
sys.path.insert(0, os.path.dirname(__file__))
from app.models.models import Alert

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found in environment variables")
    sys.exit(1)

async def cleanup_alerts(days: int = 7, delete_read: bool = False, dry_run: bool = False):
    """Clean up old and duplicate alerts."""
    print(f"🧹 Starting alert cleanup...")
    print(f"   - Delete alerts older than: {days} days")
    print(f"   - Delete read alerts: {'Yes' if delete_read else 'No'}")
    print(f"   - Dry run mode: {'Yes (no changes will be made)' if dry_run else 'No'}")
    print()
    
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get total count before cleanup
        total_result = await session.execute(select(func.count(Alert.id)))
        total_before = total_result.scalar() or 0
        print(f"📊 Total alerts before cleanup: {total_before}")
        
        deleted_count = 0
        
        # 1. Delete old alerts
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        old_alerts_query = select(Alert).where(Alert.created_at < cutoff_date)
        
        if delete_read:
            # Delete all old alerts
            old_result = await session.execute(old_alerts_query)
        else:
            # Delete only unread old alerts
            old_result = await session.execute(
                old_alerts_query.where(Alert.is_read == False)
            )
        
        old_alerts = old_result.scalars().all()
        
        if old_alerts:
            print(f"\n🗑️  Found {len(old_alerts)} old alert(s) to delete:")
            for alert in old_alerts[:5]:  # Show first 5
                print(f"   - {alert.title} ({alert.created_at.strftime('%Y-%m-%d %H:%M')})")
            if len(old_alerts) > 5:
                print(f"   ... and {len(old_alerts) - 5} more")
            
            if not dry_run:
                for alert in old_alerts:
                    await session.delete(alert)
                deleted_count += len(old_alerts)
        
        # 2. Find and delete duplicate alerts (same type, profile, within 1 hour)
        print(f"\n🔍 Checking for duplicate alerts...")
        
        all_alerts_result = await session.execute(
            select(Alert).order_by(Alert.profile_id, Alert.alert_type, Alert.created_at.desc())
        )
        all_alerts = all_alerts_result.scalars().all()
        
        # Group by profile_id + alert_type
        groups = {}
        for alert in all_alerts:
            key = (alert.profile_id, alert.alert_type, alert.severity)
            if key not in groups:
                groups[key] = []
            groups[key].append(alert)
        
        duplicates = []
        for key, alerts_in_group in groups.items():
            if len(alerts_in_group) <= 1:
                continue
            
            # Keep the first (most recent), delete others within 1 hour
            kept = alerts_in_group[0]
            for alert in alerts_in_group[1:]:
                time_diff = kept.created_at - alert.created_at
                if time_diff < timedelta(hours=1):
                    duplicates.append(alert)
        
        if duplicates:
            print(f"\n🗑️  Found {len(duplicates)} duplicate alert(s) to delete:")
            # Show sample
            for alert in duplicates[:5]:
                print(f"   - {alert.title} ({alert.created_at.strftime('%Y-%m-%d %H:%M')})")
            if len(duplicates) > 5:
                print(f"   ... and {len(duplicates) - 5} more")
            
            if not dry_run:
                for alert in duplicates:
                    await session.delete(alert)
                deleted_count += len(duplicates)
        
        # 3. Optionally delete all read alerts
        if delete_read:
            print(f"\n🔍 Checking for read alerts...")
            read_result = await session.execute(
                select(Alert).where(Alert.is_read == True)
            )
            read_alerts = read_result.scalars().all()
            
            if read_alerts:
                print(f"\n🗑️  Found {len(read_alerts)} read alert(s) to delete")
                
                if not dry_run:
                    for alert in read_alerts:
                        await session.delete(alert)
                    deleted_count += len(read_alerts)
        
        # Commit changes
        if not dry_run and deleted_count > 0:
            await session.commit()
            print(f"\n✅ Successfully deleted {deleted_count} alert(s)")
        elif dry_run:
            print(f"\n💡 Dry run: Would delete {deleted_count} alert(s)")
        else:
            print(f"\n✨ No alerts to delete")
        
        # Get total count after cleanup
        total_result = await session.execute(select(func.count(Alert.id)))
        total_after = total_result.scalar() or 0
        print(f"\n📊 Total alerts after cleanup: {total_after}")
        print(f"   Reduction: {total_before - total_after} alert(s)")
    
    await engine.dispose()
    print("\n🎉 Cleanup completed!")

def main():
    parser = argparse.ArgumentParser(description="Clean up old and duplicate alerts")
    parser.add_argument("--days", type=int, default=7, help="Delete alerts older than N days (default: 7)")
    parser.add_argument("--delete-read", action="store_true", help="Also delete read alerts")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted without actually deleting")
    
    args = parser.parse_args()
    
    asyncio.run(cleanup_alerts(
        days=args.days,
        delete_read=args.delete_read,
        dry_run=args.dry_run
    ))

if __name__ == "__main__":
    main()
