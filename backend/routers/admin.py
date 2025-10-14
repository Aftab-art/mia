from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional

from database import get_db
from models import User, AttendanceRecord, LoginAttempt, SecurityEvent
from routers.auth import get_current_user

router = APIRouter()

def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/users")
async def get_all_users(
    skip: int = Query(0, description="Number of records to skip"),
    limit: int = Query(100, description="Number of records to return"),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = db.query(User).offset(skip).limit(limit).all()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "face_registered": user.face_registered,
            "totp_enabled": user.totp_enabled,
            "created_at": user.created_at,
            "login_attempts": user.login_attempts,
            "locked_until": user.locked_until
        }
        for user in users
    ]

@router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed user information (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get recent attendance records
    recent_attendance = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == user_id
    ).order_by(desc(AttendanceRecord.check_in_time)).limit(10).all()
    
    # Get recent login attempts
    recent_logins = db.query(LoginAttempt).filter(
        LoginAttempt.user_id == user_id
    ).order_by(desc(LoginAttempt.timestamp)).limit(10).all()
    
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "phone_number": user.phone_number,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "face_registered": user.face_registered,
            "totp_enabled": user.totp_enabled,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "login_attempts": user.login_attempts,
            "locked_until": user.locked_until
        },
        "recent_attendance": [
            {
                "id": record.id,
                "check_in_time": record.check_in_time,
                "check_out_time": record.check_out_time,
                "work_duration": record.work_duration,
                "location": record.location,
                "face_verified": record.face_verified
            }
            for record in recent_attendance
        ],
        "recent_logins": [
            {
                "id": login.id,
                "timestamp": login.timestamp,
                "ip_address": login.ip_address,
                "success": login.success,
                "failure_reason": login.failure_reason
            }
            for login in recent_logins
        ]
    }

@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Activate/deactivate user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = not user.is_active
    db.commit()
    
    status_text = "activated" if user.is_active else "deactivated"
    return {"message": f"User {status_text} successfully"}

@router.put("/users/{user_id}/unlock")
async def unlock_user(
    user_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Unlock user account (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.login_attempts = 0
    user.locked_until = None
    db.commit()
    
    return {"message": "User unlocked successfully"}

@router.get("/attendance/all")
async def get_all_attendance(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    skip: int = Query(0, description="Number of records to skip"),
    limit: int = Query(100, description="Number of records to return"),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all attendance records (admin only)"""
    query = db.query(AttendanceRecord)
    
    # Apply filters
    if user_id:
        query = query.filter(AttendanceRecord.user_id == user_id)
    
    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(AttendanceRecord.check_in_time >= start_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD"
            )
    
    if end_date:
        try:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
            end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
            query = query.filter(AttendanceRecord.check_in_time <= end_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD"
            )
    
    records = query.order_by(desc(AttendanceRecord.check_in_time)).offset(skip).limit(limit).all()
    
    # Get user information for each record
    result = []
    for record in records:
        user = db.query(User).filter(User.id == record.user_id).first()
        result.append({
            "id": record.id,
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name
            } if user else None,
            "check_in_time": record.check_in_time,
            "check_out_time": record.check_out_time,
            "work_duration": record.work_duration,
            "location": record.location,
            "face_verified": record.face_verified,
            "ip_address": record.ip_address,
            "created_at": record.created_at
        })
    
    return result

@router.get("/security-events")
async def get_security_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    skip: int = Query(0, description="Number of records to skip"),
    limit: int = Query(100, description="Number of records to return"),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get security events (admin only)"""
    query = db.query(SecurityEvent)
    
    # Apply filters
    if event_type:
        query = query.filter(SecurityEvent.event_type == event_type)
    
    if severity:
        query = query.filter(SecurityEvent.severity == severity)
    
    events = query.order_by(desc(SecurityEvent.timestamp)).offset(skip).limit(limit).all()
    
    # Get user information for each event
    result = []
    for event in events:
        user = db.query(User).filter(User.id == event.user_id).first() if event.user_id else None
        result.append({
            "id": event.id,
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name
            } if user else None,
            "event_type": event.event_type,
            "description": event.description,
            "ip_address": event.ip_address,
            "severity": event.severity,
            "timestamp": event.timestamp
        })
    
    return result

@router.get("/dashboard")
async def get_admin_dashboard(admin_user: User = Depends(get_admin_user),
                            db: Session = Depends(get_db)):
    """Get admin dashboard data"""
    
    # User statistics
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    locked_users = db.query(User).filter(User.locked_until.isnot(None)).count()
    users_with_face = db.query(User).filter(User.face_registered == True).count()
    users_with_totp = db.query(User).filter(User.totp_enabled == True).count()
    
    # Today's attendance
    today = datetime.now().date()
    today_checkins = db.query(AttendanceRecord).filter(
        AttendanceRecord.check_in_time >= datetime.combine(today, datetime.min.time()),
        AttendanceRecord.check_in_time <= datetime.combine(today, datetime.max.time())
    ).count()
    
    # Recent security events
    recent_events = db.query(SecurityEvent).order_by(
        desc(SecurityEvent.timestamp)
    ).limit(10).all()
    
    # Recent login attempts
    recent_logins = db.query(LoginAttempt).order_by(
        desc(LoginAttempt.timestamp)
    ).limit(10).all()
    
    return {
        "user_stats": {
            "total_users": total_users,
            "active_users": active_users,
            "locked_users": locked_users,
            "users_with_face": users_with_face,
            "users_with_totp": users_with_totp
        },
        "attendance_stats": {
            "today_checkins": today_checkins
        },
        "recent_events": [
            {
                "id": event.id,
                "event_type": event.event_type,
                "description": event.description,
                "severity": event.severity,
                "timestamp": event.timestamp,
                "user_id": event.user_id
            }
            for event in recent_events
        ],
        "recent_logins": [
            {
                "id": login.id,
                "username": login.username,
                "success": login.success,
                "failure_reason": login.failure_reason,
                "timestamp": login.timestamp,
                "ip_address": login.ip_address
            }
            for login in recent_logins
        ]
    }
