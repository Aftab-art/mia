from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Face recognition data
    face_encoding = Column(Text, nullable=True)  # JSON string of face encoding
    face_registered = Column(Boolean, default=False)
    
    # TOTP data
    totp_secret = Column(String(32), nullable=True)
    totp_enabled = Column(Boolean, default=False)
    
    # Phone for SMS OTP
    phone_number = Column(String(20), nullable=True)
    
    # Login attempts tracking
    login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    attendance_records = relationship("AttendanceRecord", back_populates="user")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    check_in_time = Column(DateTime(timezone=True), nullable=False)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    work_duration = Column(Float, nullable=True)  # in hours
    location = Column(String(100), nullable=True)
    face_verified = Column(Boolean, default=False)
    face_image = Column(Text, nullable=True)  # base64 encoded face image
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="attendance_records")

class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(50), nullable=True)
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text, nullable=True)
    success = Column(Boolean, default=False)
    failure_reason = Column(String(100), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_type = Column(String(50), nullable=False)  # login, face_failure, totp_failure, etc.
    description = Column(Text, nullable=False)
    ip_address = Column(String(45), nullable=True)
    severity = Column(String(20), default="info")  # info, warning, error, critical
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
