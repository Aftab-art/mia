from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import base64
import json
import pyotp
import qrcode
from io import BytesIO

from models import User, LoginAttempt, SecurityEvent
from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except JWTError:
            return None

    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password"""
        user = self.db.query(User).filter(User.username == username).first()
        if not user or not self.verify_password(password, user.password_hash):
            return None
        return user

    def register_user(self, username: str, email: str, password: str, full_name: str, phone: str = None) -> User:
        """Register a new user"""
        # Check if user already exists
        if self.db.query(User).filter(User.username == username).first():
            raise ValueError("Username already exists")
        
        if self.db.query(User).filter(User.email == email).first():
            raise ValueError("Email already exists")

        # Create new user
        user = User(
            username=username,
            email=email,
            password_hash=self.get_password_hash(password),
            full_name=full_name,
            phone=phone,
            is_active=True,
            is_admin=False
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user

    def setup_totp(self, user_id: int) -> dict:
        """Setup TOTP for a user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        # Generate secret
        secret = pyotp.random_base32()
        
        # Create TOTP object
        totp = pyotp.TOTP(secret)
        
        # Generate provisioning URI
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name="MFA Attendance System"
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        qr_code_data = base64.b64encode(buffer.getvalue()).decode()
        
        # Update user with TOTP secret
        user.totp_secret = secret
        self.db.commit()
        
        return {
            "secret": secret,
            "qr_code": f"data:image/png;base64,{qr_code_data}",
            "provisioning_uri": provisioning_uri
        }

    def verify_totp(self, user_id: int, token: str) -> bool:
        """Verify TOTP token"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.totp_secret:
            return False
        
        totp = pyotp.TOTP(user.totp_secret)
        return totp.verify(token, valid_window=1)

    def setup_face_recognition(self, user_id: int, face_image_base64: str) -> bool:
        """Setup face recognition for a user (mock implementation)"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        try:
            # Mock face encoding - in production, use actual face recognition
            # For now, we'll just store a hash of the image data
            import hashlib
            image_data = base64.b64decode(face_image_base64.split(',')[1])
            face_encoding = hashlib.sha256(image_data).digest()
            
            user.face_encoding = face_encoding
            self.db.commit()
            return True
        except Exception as e:
            print(f"Face recognition setup error: {e}")
            return False

    def verify_face(self, user_id: int, face_image_base64: str) -> bool:
        """Verify face against stored encoding (mock implementation)"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.face_encoding:
            return False
        
        try:
            # Mock face verification - in production, use actual face recognition
            import hashlib
            image_data = base64.b64decode(face_image_base64.split(',')[1])
            current_encoding = hashlib.sha256(image_data).digest()
            
            # For demo purposes, we'll do a simple comparison
            # In production, use proper face comparison algorithms
            return current_encoding == user.face_encoding
        except Exception as e:
            print(f"Face verification error: {e}")
            return False

    def log_login_attempt(self, username: str, ip_address: str, success: bool, failure_reason: str = None):
        """Log login attempt"""
        attempt = LoginAttempt(
            username=username,
            ip_address=ip_address,
            success=success,
            failure_reason=failure_reason,
            timestamp=datetime.utcnow()
        )
        self.db.add(attempt)
        self.db.commit()

    def log_security_event(self, user_id: int, event_type: str, description: str, ip_address: str = None):
        """Log security event"""
        event = SecurityEvent(
            user_id=user_id,
            event_type=event_type,
            description=description,
            ip_address=ip_address,
            timestamp=datetime.utcnow()
        )
        self.db.add(event)
        self.db.commit()

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()

    def update_user_password(self, user_id: int, new_password: str) -> bool:
        """Update user password"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.password_hash = self.get_password_hash(new_password)
        self.db.commit()
        return True

    def get_recent_login_attempts(self, username: str, hours: int = 24) -> list:
        """Get recent login attempts for a user"""
        since = datetime.utcnow() - timedelta(hours=hours)
        return self.db.query(LoginAttempt).filter(
            LoginAttempt.username == username,
            LoginAttempt.timestamp >= since
        ).order_by(LoginAttempt.timestamp.desc()).all()

    def get_security_events(self, user_id: int, limit: int = 10) -> list:
        """Get recent security events for a user"""
        return self.db.query(SecurityEvent).filter(
            SecurityEvent.user_id == user_id
        ).order_by(SecurityEvent.timestamp.desc()).limit(limit).all()
