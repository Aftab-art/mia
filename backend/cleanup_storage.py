#!/usr/bin/env python3
"""
Storage cleanup utility for attendance system
Helps manage database storage by removing old attendance records
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import AttendanceRecord, User
from datetime import datetime, timedelta
from sqlalchemy import func

def show_storage_stats():
    """Show current storage statistics"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*70)
        print("CURRENT STORAGE STATISTICS")
        print("="*70)
        
        # Total records
        total_records = db.query(AttendanceRecord).count()
        records_with_images = db.query(AttendanceRecord).filter(
            AttendanceRecord.face_image.isnot(None)
        ).count()
        
        print(f"\n📊 Records:")
        print(f"  - Total attendance records: {total_records}")
        print(f"  - Records with face images: {records_with_images}")
        print(f"  - Records without images: {total_records - records_with_images}")
        
        # Calculate storage
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.face_image.isnot(None)
        ).all()
        
        total_size = sum(len(r.face_image) for r in records if r.face_image)
        
        print(f"\n💾 Storage:")
        print(f"  - Total image storage: {total_size:,} bytes")
        print(f"  - In KB: {total_size / 1024:.2f} KB")
        print(f"  - In MB: {total_size / (1024*1024):.2f} MB")
        
        if records_with_images > 0:
            avg_size = total_size / records_with_images
            print(f"  - Average image size: {avg_size:.2f} bytes ({avg_size / 1024:.2f} KB)")
        
        # Database file size
        db_path = "mfa_attendance.db"
        if os.path.exists(db_path):
            db_size = os.path.getsize(db_path)
            print(f"\n📁 Database File:")
            print(f"  - File: {db_path}")
            print(f"  - Size: {db_size:,} bytes ({db_size / 1024:.2f} KB, {db_size / (1024*1024):.2f} MB)")
        
        # Age of records
        oldest_record = db.query(AttendanceRecord).order_by(AttendanceRecord.check_in_time).first()
        newest_record = db.query(AttendanceRecord).order_by(AttendanceRecord.check_in_time.desc()).first()
        
        if oldest_record and newest_record:
            print(f"\n📅 Record Age:")
            print(f"  - Oldest record: {oldest_record.check_in_time.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"  - Newest record: {newest_record.check_in_time.strftime('%Y-%m-%d %H:%M:%S')}")
            days_span = (newest_record.check_in_time - oldest_record.check_in_time).days
            print(f"  - Span: {days_span} days")
        
    finally:
        db.close()


def cleanup_old_records(days_to_keep: int, delete_records: bool = False):
    """
    Clean up old attendance records
    
    Args:
        days_to_keep: Keep records newer than this many days
        delete_records: If True, delete entire records. If False, only remove face images
    """
    db = SessionLocal()
    
    try:
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        # Find old records
        if delete_records:
            old_records = db.query(AttendanceRecord).filter(
                AttendanceRecord.check_in_time < cutoff_date
            ).all()
        else:
            old_records = db.query(AttendanceRecord).filter(
                AttendanceRecord.check_in_time < cutoff_date,
                AttendanceRecord.face_image.isnot(None)
            ).all()
        
        if not old_records:
            print(f"\n✅ No records older than {days_to_keep} days found")
            return
        
        # Calculate space to be freed
        total_size = sum(len(r.face_image) for r in old_records if r.face_image)
        
        print(f"\n🗑️  Records to clean:")
        print(f"  - Found: {len(old_records)} records")
        print(f"  - Older than: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  - Space to free: {total_size:,} bytes ({total_size / 1024:.2f} KB, {total_size / (1024*1024):.2f} MB)")
        
        if delete_records:
            print(f"  - Action: DELETE entire records")
        else:
            print(f"  - Action: Remove face images only (keep attendance data)")
        
        # Confirm
        print(f"\n⚠️  WARNING: This action cannot be undone!")
        confirm = input(f"Are you sure you want to continue? (yes/no): ")
        
        if confirm.lower() != 'yes':
            print("❌ Cleanup cancelled")
            return
        
        # Perform cleanup
        if delete_records:
            # Delete entire records
            for record in old_records:
                db.delete(record)
        else:
            # Just remove face images
            for record in old_records:
                record.face_image = None
        
        db.commit()
        
        print(f"\n✅ Cleanup complete!")
        print(f"  - Records processed: {len(old_records)}")
        print(f"  - Space freed: {total_size / (1024*1024):.2f} MB")
        
        # Run VACUUM to reclaim space (SQLite specific)
        if delete_records:
            print(f"\n🔧 Running VACUUM to reclaim disk space...")
            db.execute("VACUUM")
            print(f"✅ VACUUM complete")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()


def cleanup_by_user(user_id: int, days_to_keep: int):
    """Clean up old records for a specific user"""
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"❌ User with ID {user_id} not found")
            return
        
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        old_records = db.query(AttendanceRecord).filter(
            AttendanceRecord.user_id == user_id,
            AttendanceRecord.check_in_time < cutoff_date,
            AttendanceRecord.face_image.isnot(None)
        ).all()
        
        if not old_records:
            print(f"✅ No old records found for user {user.username}")
            return
        
        total_size = sum(len(r.face_image) for r in old_records if r.face_image)
        
        print(f"\n🗑️  Cleaning records for user: {user.username}")
        print(f"  - Records: {len(old_records)}")
        print(f"  - Space to free: {total_size / 1024:.2f} KB")
        
        for record in old_records:
            record.face_image = None
        
        db.commit()
        print(f"✅ Cleanup complete for {user.username}")
        
    finally:
        db.close()


def delete_all_face_images():
    """Delete ALL face images from attendance records (emergency cleanup)"""
    db = SessionLocal()
    
    try:
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.face_image.isnot(None)
        ).all()
        
        if not records:
            print("✅ No face images to delete")
            return
        
        total_size = sum(len(r.face_image) for r in records if r.face_image)
        
        print(f"\n⚠️  EMERGENCY CLEANUP")
        print(f"  - This will delete ALL {len(records)} face images")
        print(f"  - Space to free: {total_size / (1024*1024):.2f} MB")
        print(f"  - Attendance data will be preserved")
        
        confirm = input(f"\nType 'DELETE ALL' to confirm: ")
        
        if confirm != 'DELETE ALL':
            print("❌ Cleanup cancelled")
            return
        
        for record in records:
            record.face_image = None
        
        db.commit()
        print(f"\n✅ All face images deleted!")
        print(f"  - Space freed: {total_size / (1024*1024):.2f} MB")
        
    finally:
        db.close()


def interactive_menu():
    """Interactive menu for storage cleanup"""
    while True:
        print("\n" + "="*70)
        print("STORAGE CLEANUP UTILITY")
        print("="*70)
        print("\n1. Show storage statistics")
        print("2. Remove face images older than X days (keep attendance data)")
        print("3. Delete entire records older than X days")
        print("4. Clean up specific user's old records")
        print("5. Emergency: Delete ALL face images")
        print("6. Exit")
        
        choice = input("\nEnter your choice (1-6): ")
        
        if choice == '1':
            show_storage_stats()
        
        elif choice == '2':
            days = input("Keep records from last how many days? (e.g., 30, 90): ")
            try:
                days = int(days)
                cleanup_old_records(days, delete_records=False)
            except ValueError:
                print("❌ Invalid number")
        
        elif choice == '3':
            days = input("Keep records from last how many days? (e.g., 30, 90): ")
            try:
                days = int(days)
                cleanup_old_records(days, delete_records=True)
            except ValueError:
                print("❌ Invalid number")
        
        elif choice == '4':
            user_id = input("Enter user ID: ")
            days = input("Keep records from last how many days? ")
            try:
                user_id = int(user_id)
                days = int(days)
                cleanup_by_user(user_id, days)
            except ValueError:
                print("❌ Invalid input")
        
        elif choice == '5':
            delete_all_face_images()
        
        elif choice == '6':
            print("\n👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Command line mode
        command = sys.argv[1]
        
        if command == 'stats':
            show_storage_stats()
        elif command == 'cleanup':
            days = int(sys.argv[2]) if len(sys.argv) > 2 else 90
            cleanup_old_records(days, delete_records=False)
        elif command == 'delete':
            days = int(sys.argv[2]) if len(sys.argv) > 2 else 90
            cleanup_old_records(days, delete_records=True)
        else:
            print("Usage:")
            print("  python cleanup_storage.py             # Interactive mode")
            print("  python cleanup_storage.py stats       # Show statistics")
            print("  python cleanup_storage.py cleanup 90  # Remove images older than 90 days")
            print("  python cleanup_storage.py delete 90   # Delete records older than 90 days")
    else:
        # Interactive mode
        interactive_menu()
