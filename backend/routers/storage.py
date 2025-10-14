"""
Storage management API endpoints
Requires admin privileges
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import os

from database import get_db
from models import User, AttendanceRecord
from routers.auth import get_current_user

router = APIRouter()

class CleanupRequest(BaseModel):
    days_to_keep: int = 90
    delete_records: bool = False  # If True, delete entire records. If False, only remove images
    user_id: Optional[int] = None  # If provided, only cleanup this user's records

class StorageStats(BaseModel):
    total_records: int
    records_with_images: int
    records_without_images: int
    total_size_bytes: int
    total_size_kb: float
    total_size_mb: float
    average_image_size_kb: float
    database_file_size_mb: float
    oldest_record: Optional[str]
    newest_record: Optional[str]
    days_span: int

def check_admin(current_user: User):
    """Check if current user is admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

@router.get("/stats", response_model=StorageStats)
async def get_storage_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get storage statistics (Admin only)"""
    check_admin(current_user)
    
    # Count records
    total_records = db.query(AttendanceRecord).count()
    records_with_images = db.query(AttendanceRecord).filter(
        AttendanceRecord.face_image.isnot(None)
    ).count()
    
    # Calculate storage
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.face_image.isnot(None)
    ).all()
    
    total_size = sum(len(r.face_image) for r in records if r.face_image)
    avg_size = total_size / records_with_images if records_with_images > 0 else 0
    
    # Database file size
    db_path = "mfa_attendance.db"
    db_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0
    
    # Record age
    oldest_record = db.query(AttendanceRecord).order_by(AttendanceRecord.check_in_time).first()
    newest_record = db.query(AttendanceRecord).order_by(AttendanceRecord.check_in_time.desc()).first()
    
    days_span = 0
    oldest_str = None
    newest_str = None
    
    if oldest_record and newest_record:
        oldest_str = oldest_record.check_in_time.isoformat()
        newest_str = newest_record.check_in_time.isoformat()
        days_span = (newest_record.check_in_time - oldest_record.check_in_time).days
    
    return StorageStats(
        total_records=total_records,
        records_with_images=records_with_images,
        records_without_images=total_records - records_with_images,
        total_size_bytes=total_size,
        total_size_kb=total_size / 1024,
        total_size_mb=total_size / (1024*1024),
        average_image_size_kb=avg_size / 1024,
        database_file_size_mb=db_size / (1024*1024),
        oldest_record=oldest_str,
        newest_record=newest_str,
        days_span=days_span
    )

@router.post("/cleanup")
async def cleanup_storage(
    cleanup_data: CleanupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clean up old attendance records (Admin only)"""
    check_admin(current_user)
    
    try:
        cutoff_date = datetime.now() - timedelta(days=cleanup_data.days_to_keep)
        
        # Build query
        query = db.query(AttendanceRecord).filter(
            AttendanceRecord.check_in_time < cutoff_date
        )
        
        # Filter by user if specified
        if cleanup_data.user_id:
            query = query.filter(AttendanceRecord.user_id == cleanup_data.user_id)
        
        # Only get records with images if not deleting entire records
        if not cleanup_data.delete_records:
            query = query.filter(AttendanceRecord.face_image.isnot(None))
        
        old_records = query.all()
        
        if not old_records:
            return {
                "success": True,
                "message": f"No records older than {cleanup_data.days_to_keep} days found",
                "records_processed": 0,
                "space_freed_mb": 0
            }
        
        # Calculate space to be freed
        total_size = sum(len(r.face_image) for r in old_records if r.face_image)
        
        # Perform cleanup
        if cleanup_data.delete_records:
            # Delete entire records
            for record in old_records:
                db.delete(record)
            action = "deleted"
        else:
            # Just remove face images
            for record in old_records:
                record.face_image = None
            action = "cleaned (images removed)"
        
        db.commit()
        
        # Run VACUUM if records were deleted (SQLite specific)
        if cleanup_data.delete_records:
            db.execute("VACUUM")
        
        return {
            "success": True,
            "message": f"Successfully {action} {len(old_records)} records",
            "records_processed": len(old_records),
            "space_freed_mb": total_size / (1024*1024),
            "action": "deleted_records" if cleanup_data.delete_records else "removed_images"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cleanup failed: {str(e)}"
        )

@router.delete("/all-images")
async def delete_all_images(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Emergency: Delete ALL face images (Admin only)"""
    check_admin(current_user)
    
    try:
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.face_image.isnot(None)
        ).all()
        
        if not records:
            return {
                "success": True,
                "message": "No face images to delete",
                "records_processed": 0,
                "space_freed_mb": 0
            }
        
        total_size = sum(len(r.face_image) for r in records if r.face_image)
        
        for record in records:
            record.face_image = None
        
        db.commit()
        
        return {
            "success": True,
            "message": f"All face images deleted. Attendance data preserved.",
            "records_processed": len(records),
            "space_freed_mb": total_size / (1024*1024)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Emergency cleanup failed: {str(e)}"
        )
