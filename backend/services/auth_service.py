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
        
        # Ensure sub (subject) is a string for JWT compliance
        if "sub" in to_encode and isinstance(to_encode["sub"], int):
            to_encode["sub"] = str(to_encode["sub"])
            
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
        """Setup face recognition using perceptual hashing"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        try:
            from PIL import Image
            from io import BytesIO
            
            # Decode image
            image_data = base64.b64decode(face_image_base64.split(',')[1])
            image = Image.open(BytesIO(image_data))
            
            # Convert to grayscale and resize
            image = image.convert('L').resize((32, 32))
            
            # Generate perceptual hash
            face_encoding = self._get_perceptual_hash(image)
            
            user.face_encoding = face_encoding
            user.face_registered = True
            self.db.commit()
            
            print(f"Face registration successful for {user.username}")
            print(f"  - Perceptual hash stored: {len(face_encoding)} bytes")
            
            return True
        except Exception as e:
            print(f"Face recognition setup error: {e}")
            import traceback
            traceback.print_exc()
            return False

    def verify_face(self, user_id: int, face_image_base64: str) -> bool:
        """Verify face against stored encoding using perceptual hashing"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.face_encoding:
            return False
        
        try:
            from PIL import Image
            from io import BytesIO
            import hashlib
            
            # Decode the current image
            image_data = base64.b64decode(face_image_base64.split(',')[1])
            
            # Basic validation
            if len(image_data) < 100:
                print(f"Face verification failed: Image too small")
                return False
            
            # Load image using PIL
            current_image = Image.open(BytesIO(image_data))
            
            # Convert to grayscale and resize for comparison
            current_image = current_image.convert('L').resize((32, 32))
            
            # Get stored encoding (which is the hash of the registered image)
            stored_hash = user.face_encoding
            
            # Calculate perceptual hash of current image
            # This creates a hash that's similar for similar images
            current_hash = self._get_perceptual_hash(current_image)
            
            # Calculate Hamming distance between hashes
            # Hamming distance counts how many bits are different
            distance = self._hamming_distance(stored_hash, current_hash)
            
            # Lower distance = more similar
            # Threshold: accept if distance < 20% of total bits (allows for slight variations)
            max_bits = len(stored_hash) * 8  # Total bits in hash
            threshold = int(max_bits * 0.20)  # 20% difference allowed
            
            is_match = distance < threshold
            similarity_percent = ((max_bits - distance) / max_bits) * 100
            
            print(f"Face verification for user {user.username}:")
            print(f"  - Image size: {len(image_data)} bytes")
            print(f"  - Hamming distance: {distance}/{max_bits} bits")
            print(f"  - Similarity: {similarity_percent:.1f}%")
            print(f"  - Threshold: < {threshold} bits ({80}% similarity required)")
            print(f"  - Match: {'✅ YES' if is_match else '❌ NO'}")
            
            if not is_match:
                print(f"  - REASON: Images are too different (similarity {similarity_percent:.1f}% < 80%)")
            
            return is_match
            
        except Exception as e:
            print(f"Face verification error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _get_perceptual_hash(self, image) -> bytes:
        """
        Calculate perceptual hash of an image
        Similar images will have similar hashes
        """
        from PIL import Image
        import hashlib
        
        # Resize to small size
        small_image = image.resize((8, 8), Image.Resampling.LANCZOS)
        
        # Get pixel values
        pixels = list(small_image.getdata())
        
        # Calculate average pixel value
        avg = sum(pixels) / len(pixels)
        
        # Create hash based on whether each pixel is above/below average
        # This creates a perceptual hash that's similar for similar images
        hash_bits = ''.join(['1' if p > avg else '0' for p in pixels])
        
        # Convert binary string to bytes
        hash_bytes = int(hash_bits, 2).to_bytes(8, byteorder='big')
        
        return hash_bytes
    
    def _hamming_distance(self, hash1: bytes, hash2: bytes) -> int:
        """
        Calculate Hamming distance between two hashes
        Returns the number of differing bits
        """
        if len(hash1) != len(hash2):
            # If lengths differ, use regular comparison
            return sum(1 for a, b in zip(hash1, hash2) if a != b) * 8
        
        # Count differing bits
        distance = 0
        for byte1, byte2 in zip(hash1, hash2):
            # XOR to find differing bits, then count them
            xor = byte1 ^ byte2
            distance += bin(xor).count('1')
        
        return distance

    def _calculate_encoding_similarity(self, encoding1: bytes, encoding2: bytes) -> float:
        """Calculate similarity between two encodings (mock implementation)"""
        # In production, this would compare face feature vectors
        # For demo, we need to verify that it's the SAME person's face
        
        if len(encoding1) != len(encoding2):
            return 0.0
        
        # Check if it's the exact same encoding (same image)
        if encoding1 == encoding2:
            return 1.0  # 100% similarity for exact match
        
        # For different images, calculate byte similarity
        # This simulates face feature comparison
        matching_bytes = sum(1 for a, b in zip(encoding1, encoding2) if a == b)
        total_bytes = len(encoding1)
        
        # Calculate similarity percentage
        similarity = matching_bytes / total_bytes
        
        # In a real face recognition system, same person's different photos would have
        # 80-95% feature similarity. Different people would have <30% similarity.
        # 
        # For demo purposes, we'll accept if:
        # - It's the EXACT same image (100% match) - for testing
        # - Very high byte similarity (>95%) - unlikely with different photos but shows intent
        
        return similarity

    def log_login_attempt(self, username: str, ip_address: str, success: bool, failure_reason: str = None, user_id: int = None, user_agent: str = None):
        """Log login attempt"""
        attempt = LoginAttempt(
            username=username,
            ip_address=ip_address,
            success=success,
            failure_reason=failure_reason,
            user_id=user_id,
            user_agent=user_agent,
            timestamp=datetime.utcnow()
        )
        self.db.add(attempt)
        self.db.commit()

    def log_security_event(self, user_id: int, event_type: str, description: str, ip_address: str = None, severity: str = "info"):
        """Log security event"""
        event = SecurityEvent(
            user_id=user_id,
            event_type=event_type,
            description=description,
            ip_address=ip_address,
            severity=severity,
            timestamp=datetime.utcnow()
        )
        self.db.add(event)
        self.db.commit()

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()

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

    def is_account_locked(self, user: User) -> bool:
        """Check if account is locked due to failed attempts"""
        # Simple implementation - check if user has too many recent failed attempts
        recent_failed_attempts = self.db.query(LoginAttempt).filter(
            LoginAttempt.username == user.username,
            LoginAttempt.success == False,
            LoginAttempt.timestamp >= datetime.utcnow() - timedelta(hours=1)
        ).count()
        return recent_failed_attempts >= 5  # Lock after 5 failed attempts in 1 hour

    def increment_login_attempts(self, user: User):
        """Increment login attempts for user"""
        # This is a simple implementation - in production you'd want more sophisticated logic
        pass

    def reset_login_attempts(self, user: User):
        """Reset login attempts for user"""
        # This is a simple implementation - in production you'd want more sophisticated logic
        pass

    def register_face_encoding(self, user: User, face_image_base64: str) -> bool:
        """Register face encoding for user"""
        return self.setup_face_recognition(user.id, face_image_base64)

    def verify_face_user(self, user: User, face_image_base64: str) -> bool:
        """Verify user's face"""
        return self.verify_face(user.id, face_image_base64)

    def generate_totp_secret(self, user: User) -> str:
        """Generate TOTP secret for user"""
        secret = pyotp.random_base32()
        user.totp_secret = secret
        self.db.commit()
        return secret

    def generate_totp_qr_code(self, user: User, secret: str) -> str:
        """Generate TOTP QR code for user"""
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name="MFA Attendance System"
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        qr_code_data = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{qr_code_data}"

    def verify_totp_user(self, user: User, token: str) -> bool:
        """Verify TOTP token for user"""
        if not user.totp_secret:
            return False
        return self.verify_totp(user.id, token)

    def enable_totp(self, user: User):
        """Enable TOTP for user"""
        user.totp_enabled = True
        self.db.commit()
