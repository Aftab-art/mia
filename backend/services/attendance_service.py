from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from models import AttendanceRecord, User
from services.auth_service import AuthService

class AttendanceService:
    def __init__(self, db: Session):
        self.db = db
        self.auth_service = AuthService(db)
    
    def check_in(self, user: User, face_image_base64: str, location: Optional[str] = None, 
                ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
        """Check in user with face verification"""
        
        # Check if user already checked in today
        today = datetime.now().date()
        existing_record = self.db.query(AttendanceRecord).filter(
            and_(
                AttendanceRecord.user_id == user.id,
                AttendanceRecord.check_in_time >= datetime.combine(today, datetime.min.time()),
                AttendanceRecord.check_out_time.is_(None)
            )
        ).first()
        
        if existing_record:
            return {
                "success": False,
                "message": "You have already checked in today",
                "check_in_time": existing_record.check_in_time
            }
        
        # Verify face if face recognition is enabled
        if user.face_registered:
            if not self.auth_service.verify_face_user(user, face_image_base64):
                return {
                    "success": False,
                    "message": "Face verification failed. The face in your photo doesn't match your registered face. Please try again with better lighting and ensure your face is clearly visible."
                }
        
        # Create attendance record
        attendance_record = AttendanceRecord(
            user_id=user.id,
            check_in_time=datetime.now(),
            location=location,
            face_verified=user.face_registered,
            face_image=face_image_base64,  # Store the captured face image
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.db.add(attendance_record)
        self.db.commit()
        self.db.refresh(attendance_record)
        
        # Log security event
        self.auth_service.log_security_event(
            user_id=user.id,
            event_type="check_in",
            description=f"User checked in at {attendance_record.check_in_time}",
            ip_address=ip_address
        )
        
        return {
            "success": True,
            "message": "Check-in successful",
            "attendance_id": attendance_record.id,
            "check_in_time": attendance_record.check_in_time,
            "face_verified": attendance_record.face_verified
        }
    
    def check_out(self, user: User, attendance_id: Optional[int] = None) -> Dict[str, Any]:
        """Check out user"""
        
        # Find today's check-in record
        today = datetime.now().date()
        
        if attendance_id:
            attendance_record = self.db.query(AttendanceRecord).filter(
                and_(
                    AttendanceRecord.id == attendance_id,
                    AttendanceRecord.user_id == user.id
                )
            ).first()
        else:
            attendance_record = self.db.query(AttendanceRecord).filter(
                and_(
                    AttendanceRecord.user_id == user.id,
                    AttendanceRecord.check_in_time >= datetime.combine(today, datetime.min.time()),
                    AttendanceRecord.check_out_time.is_(None)
                )
            ).first()
        
        if not attendance_record:
            return {
                "success": False,
                "message": "No active check-in record found"
            }
        
        if attendance_record.check_out_time:
            return {
                "success": False,
                "message": "You have already checked out today"
            }
        
        # Calculate work duration
        check_out_time = datetime.now()
        work_duration = (check_out_time - attendance_record.check_in_time).total_seconds() / 3600
        
        # Update attendance record
        attendance_record.check_out_time = check_out_time
        attendance_record.work_duration = round(work_duration, 2)
        
        self.db.commit()
        
        # Log security event
        self.auth_service.log_security_event(
            user_id=user.id,
            event_type="check_out",
            description=f"User checked out at {check_out_time} (Work duration: {work_duration:.2f} hours)",
            ip_address=None
        )
        
        return {
            "success": True,
            "message": "Check-out successful",
            "check_in_time": attendance_record.check_in_time,
            "check_out_time": attendance_record.check_out_time,
            "work_duration": attendance_record.work_duration
        }
    
    def get_user_attendance(self, user: User, start_date: Optional[datetime] = None, 
                           end_date: Optional[datetime] = None, limit: int = 30) -> List[Dict[str, Any]]:
        """Get user's attendance records"""
        
        query = self.db.query(AttendanceRecord).filter(AttendanceRecord.user_id == user.id)
        
        if start_date:
            query = query.filter(AttendanceRecord.check_in_time >= start_date)
        if end_date:
            query = query.filter(AttendanceRecord.check_in_time <= end_date)
        
        records = query.order_by(desc(AttendanceRecord.check_in_time)).limit(limit).all()
        
        return [
            {
                "id": record.id,
                "check_in_time": record.check_in_time,
                "check_out_time": record.check_out_time,
                "work_duration": record.work_duration,
                "location": record.location,
                "face_verified": record.face_verified,
                "face_image": record.face_image,  # Include the captured face image
                "date": record.check_in_time.date()
            }
            for record in records
        ]
    
    def get_attendance_summary(self, user: User, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get attendance summary for a date range"""
        
        records = self.db.query(AttendanceRecord).filter(
            and_(
                AttendanceRecord.user_id == user.id,
                AttendanceRecord.check_in_time >= start_date,
                AttendanceRecord.check_in_time <= end_date
            )
        ).all()
        
        total_days = len(records)
        total_hours = sum(record.work_duration or 0 for record in records)
        average_hours = total_hours / total_days if total_days > 0 else 0
        
        # Calculate working days (excluding weekends)
        working_days = 0
        current_date = start_date.date()
        end_date_only = end_date.date()
        
        while current_date <= end_date_only:
            if current_date.weekday() < 5:  # Monday = 0, Friday = 4
                working_days += 1
            current_date += timedelta(days=1)
        
        attendance_rate = (total_days / working_days * 100) if working_days > 0 else 0
        
        return {
            "total_days": total_days,
            "working_days": working_days,
            "total_hours": round(total_hours, 2),
            "average_hours_per_day": round(average_hours, 2),
            "attendance_rate": round(attendance_rate, 2),
            "period": {
                "start_date": start_date.date(),
                "end_date": end_date.date()
            }
        }
    
    def get_today_status(self, user: User) -> Dict[str, Any]:
        """Get today's attendance status"""
        today = datetime.now().date()
        
        today_record = self.db.query(AttendanceRecord).filter(
            and_(
                AttendanceRecord.user_id == user.id,
                AttendanceRecord.check_in_time >= datetime.combine(today, datetime.min.time()),
                AttendanceRecord.check_in_time <= datetime.combine(today, datetime.max.time())
            )
        ).first()
        
        if not today_record:
            return {
                "checked_in": False,
                "checked_out": False,
                "message": "Not checked in today"
            }
        
        return {
            "checked_in": True,
            "checked_out": today_record.check_out_time is not None,
            "check_in_time": today_record.check_in_time,
            "check_out_time": today_record.check_out_time,
            "work_duration": today_record.work_duration,
            "attendance_id": today_record.id,
            "face_image": today_record.face_image  # Include the captured face image
        }
