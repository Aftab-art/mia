from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from database import get_db
from models import User
from services.attendance_service import AttendanceService
from routers.auth import get_current_user

router = APIRouter()

# Pydantic models
class CheckInRequest(BaseModel):
    face_image: str  # base64 encoded image
    location: Optional[str] = None

class AttendanceRecord(BaseModel):
    id: int
    check_in_time: datetime
    check_out_time: Optional[datetime]
    work_duration: Optional[float]
    location: Optional[str]
    face_verified: bool
    date: str

class AttendanceSummary(BaseModel):
    total_days: int
    working_days: int
    total_hours: float
    average_hours_per_day: float
    attendance_rate: float
    period: dict

@router.post("/checkin")
async def check_in(checkin_data: CheckInRequest,
                  current_user: User = Depends(get_current_user),
                  request: Request = None,
                  db: Session = Depends(get_db)):
    """Check in user with face verification"""
    attendance_service = AttendanceService(db)
    
    # Get client info
    client_ip = request.client.host if request else None
    user_agent = request.headers.get("user-agent", "") if request else None
    
    result = attendance_service.check_in(
        user=current_user,
        face_image_base64=checkin_data.face_image,
        location=checkin_data.location,
        ip_address=client_ip,
        user_agent=user_agent
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return result

@router.post("/checkout")
async def check_out(attendance_id: Optional[int] = None,
                   current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Check out user"""
    attendance_service = AttendanceService(db)
    
    result = attendance_service.check_out(
        user=current_user,
        attendance_id=attendance_id
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return result

@router.get("/today-status")
async def get_today_status(current_user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    """Get today's attendance status"""
    attendance_service = AttendanceService(db)
    
    return attendance_service.get_today_status(current_user)

@router.get("/records", response_model=List[AttendanceRecord])
async def get_attendance_records(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(30, description="Number of records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's attendance records"""
    attendance_service = AttendanceService(db)
    
    # Parse dates
    start_datetime = None
    end_datetime = None
    
    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD"
            )
    
    if end_date:
        try:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
            # Set to end of day
            end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD"
            )
    
    records = attendance_service.get_user_attendance(
        user=current_user,
        start_date=start_datetime,
        end_date=end_datetime,
        limit=limit
    )
    
    return records

@router.get("/summary", response_model=AttendanceSummary)
async def get_attendance_summary(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance summary for a date range"""
    attendance_service = AttendanceService(db)
    
    # Parse dates
    try:
        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
        end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
        # Set to end of day
        end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    if start_datetime > end_datetime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date"
        )
    
    summary = attendance_service.get_attendance_summary(
        user=current_user,
        start_date=start_datetime,
        end_date=end_datetime
    )
    
    return summary

@router.get("/monthly-summary")
async def get_monthly_summary(
    year: int = Query(..., description="Year"),
    month: int = Query(..., description="Month (1-12)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monthly attendance summary"""
    attendance_service = AttendanceService(db)
    
    # Validate month
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12"
        )
    
    # Calculate start and end of month
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = datetime(year, month + 1, 1) - timedelta(days=1)
    
    summary = attendance_service.get_attendance_summary(
        user=current_user,
        start_date=start_date,
        end_date=end_date
    )
    
    # Get daily records for the month
    records = attendance_service.get_user_attendance(
        user=current_user,
        start_date=start_date,
        end_date=end_date,
        limit=100
    )
    
    return {
        "summary": summary,
        "daily_records": records,
        "month": month,
        "year": year
    }

@router.get("/dashboard")
async def get_dashboard_data(current_user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    """Get dashboard data for current user"""
    attendance_service = AttendanceService(db)
    
    # Today's status
    today_status = attendance_service.get_today_status(current_user)
    
    # This week's summary
    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    week_summary = attendance_service.get_attendance_summary(
        user=current_user,
        start_date=datetime.combine(week_start, datetime.min.time()),
        end_date=datetime.combine(week_end, datetime.max.time())
    )
    
    # This month's summary
    month_start = datetime(today.year, today.month, 1)
    if today.month == 12:
        month_end = datetime(today.year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = datetime(today.year, today.month + 1, 1) - timedelta(days=1)
    
    month_summary = attendance_service.get_attendance_summary(
        user=current_user,
        start_date=month_start,
        end_date=month_end
    )
    
    # Recent records
    recent_records = attendance_service.get_user_attendance(
        user=current_user,
        limit=10
    )
    
    return {
        "today_status": today_status,
        "week_summary": week_summary,
        "month_summary": month_summary,
        "recent_records": recent_records,
        "user_info": {
            "username": current_user.username,
            "full_name": current_user.full_name,
            "face_registered": current_user.face_registered
        }
    }
