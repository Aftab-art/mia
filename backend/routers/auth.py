from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from database import get_db
from models import User
from services.auth_service import AuthService
from config import settings

router = APIRouter()
security = HTTPBearer()

# Pydantic models
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    phone_number: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class FaceRegistration(BaseModel):
    face_image: str  # base64 encoded image

class FaceVerification(BaseModel):
    face_image: str  # base64 encoded image

class TOTPVerification(BaseModel):
    totp_code: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    requires_face_verification: bool
    requires_totp: bool

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), 
                    db: Session = Depends(get_db)) -> User:
    """Get current authenticated user"""
    auth_service = AuthService(db)
    
    payload = auth_service.verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert string user_id back to int
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = auth_service.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user

@router.post("/register", response_model=dict)
async def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        auth_service = AuthService(db)
        
        # Check if user already exists
        if auth_service.get_user_by_username(user_data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Check if email already exists
        if auth_service.get_user_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email address is already registered. Please use a different email or try logging in."
            )
        
        # Validate password strength
        if len(user_data.password) < settings.PASSWORD_MIN_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters"
            )
        
        # Create new user
        hashed_password = auth_service.get_password_hash(user_data.password)
        
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            phone_number=user_data.phone_number
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Log security event
        try:
            auth_service.log_security_event(
                user_id=new_user.id,
                event_type="user_registered",
                description="New user registered successfully",
                severity="info"
            )
        except Exception as log_error:
            print(f"Warning: Failed to log security event: {log_error}")
        
        return {
            "message": "User registered successfully",
            "user_id": new_user.id,
            "username": new_user.username
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
        import traceback
        traceback.print_exc()
        
        # Handle specific database errors with user-friendly messages
        error_message = str(e)
        if "UNIQUE constraint failed: users.email" in error_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email address is already registered. Please use a different email or try logging in."
            )
        elif "UNIQUE constraint failed: users.username" in error_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This username is already taken. Please choose a different username."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Registration failed. Please try again later."
            )

@router.post("/login", response_model=TokenResponse)
async def login_user(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Login user with username and password"""
    auth_service = AuthService(db)
    
    # Get client info
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    # Get user
    user = auth_service.get_user_by_username(login_data.username)
    if not user:
        auth_service.log_login_attempt(
            username=login_data.username,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False,
            failure_reason="User not found"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check if account is locked
    if auth_service.is_account_locked(user):
        auth_service.log_login_attempt(
            username=login_data.username,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False,
            user_id=user.id,
            failure_reason="Account locked"
        )
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is locked due to too many failed attempts"
        )
    
    # Verify password
    if not auth_service.verify_password(login_data.password, user.hashed_password):
        auth_service.increment_login_attempts(user)
        auth_service.log_login_attempt(
            username=login_data.username,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False,
            user_id=user.id,
            failure_reason="Invalid password"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check if user is active
    if not user.is_active:
        auth_service.log_login_attempt(
            username=login_data.username,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False,
            user_id=user.id,
            failure_reason="Account inactive"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive"
        )
    
    # Reset login attempts on successful login
    auth_service.reset_login_attempts(user)
    
    # Log successful login
    auth_service.log_login_attempt(
        username=login_data.username,
        ip_address=client_ip,
        user_agent=user_agent,
        success=True,
        user_id=user.id
    )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": user.id, "username": user.username},
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        requires_face_verification=user.face_registered,
        requires_totp=user.totp_enabled
    )

@router.post("/register-face")
async def register_face(face_data: FaceRegistration, 
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Register face encoding for user"""
    auth_service = AuthService(db)
    
    success = auth_service.register_face_encoding(current_user, face_data.face_image)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Face registration failed. Please ensure your face is clearly visible."
        )
    
    return {"message": "Face registered successfully"}

@router.post("/verify-face")
async def verify_face(face_data: FaceVerification,
                     current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """Verify user's face"""
    auth_service = AuthService(db)
    
    if not current_user.face_registered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Face recognition not set up for this user"
        )
    
    success = auth_service.verify_face_user(current_user, face_data.face_image)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Face verification failed"
        )
    
    return {"message": "Face verification successful"}

@router.post("/setup-totp")
async def setup_totp(current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Setup TOTP for user"""
    auth_service = AuthService(db)
    
    secret = auth_service.generate_totp_secret(current_user)
    qr_code = auth_service.generate_totp_qr_code(current_user, secret)
    
    return {
        "secret": secret,
        "qr_code": qr_code,
        "message": "Scan QR code with authenticator app"
    }

@router.post("/verify-totp")
async def verify_totp(totp_data: TOTPVerification,
                     current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """Verify TOTP code"""
    auth_service = AuthService(db)
    
    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP not set up for this user"
        )
    
    success = auth_service.verify_totp_user(current_user, totp_data.totp_code)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid TOTP code"
        )
    
    # Enable TOTP if not already enabled
    if not current_user.totp_enabled:
        auth_service.enable_totp(current_user)
    
    return {"message": "TOTP verification successful"}

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone_number": current_user.phone_number,
        "face_registered": current_user.face_registered,
        "totp_enabled": current_user.totp_enabled,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Logout user (client should discard token)"""
    auth_service = AuthService(db)
    
    auth_service.log_security_event(
        user_id=current_user.id,
        event_type="logout",
        description="User logged out successfully",
        severity="info"
    )
    
    return {"message": "Logged out successfully"}
