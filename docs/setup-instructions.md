# Setup Instructions

## Prerequisites

### System Requirements

- **Python**: 3.8 or higher
- **Node.js**: 16 or higher
- **npm**: 8 or higher
- **Webcam**: For face recognition functionality
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge

### Hardware Requirements

- **CPU**: Dual-core processor or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Internet connection for initial setup

## Backend Setup

### 1. Python Environment Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Database Setup

```bash
# Navigate to backend directory
cd backend

# Initialize database (SQLite will be created automatically)
python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"
```

### 3. Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=sqlite:///./mfa_attendance.db

# JWT Settings
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Face Recognition
FACE_RECOGNITION_TOLERANCE=0.6
FACE_ENCODINGS_PATH=./face_encodings

# TOTP
TOTP_ISSUER_NAME=MFA Attendance System

# Security
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
PASSWORD_MIN_LENGTH=8

# Optional: Email/SMS Configuration
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USERNAME=
EMAIL_PASSWORD=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### 4. Start Backend Server

```bash
# Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using Python directly
python main.py
```

The backend API will be available at `http://localhost:8000`

## Frontend Setup

### 1. Install Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install
```

### 2. Download Face-api.js Models

The face recognition functionality requires pre-trained models. Download them from the official repository:

```bash
# Create models directory
mkdir -p public/models

# Download models (you'll need to download these manually)
# Visit: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
# Download the following files to public/models/:
# - tiny_face_detector_model-weights_manifest.json
# - tiny_face_detector_model-shard1
# - face_landmark_68_model-weights_manifest.json
# - face_landmark_68_model-shard1
# - face_recognition_model-weights_manifest.json
# - face_recognition_model-shard1
# - face_recognition_model-shard2
# - face_expression_model-weights_manifest.json
# - face_expression_model-shard1
```

### 3. Start Frontend Development Server

```bash
# Start React development server
npm start
```

The frontend application will be available at `http://localhost:3000`

## Initial Configuration

### 1. Create Admin User

After starting both servers, you can create an admin user through the registration interface or by using the API directly:

```bash
# Create admin user via API
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@company.com",
    "password": "admin123456",
    "full_name": "System Administrator",
    "phone_number": "+1234567890"
  }'
```

Then manually update the user to be an admin in the database:

```python
# In Python shell or script
from database import SessionLocal
from models import User

db = SessionLocal()
admin_user = db.query(User).filter(User.username == "admin").first()
if admin_user:
    admin_user.is_admin = True
    db.commit()
    print("Admin user created successfully")
db.close()
```

### 2. Browser Configuration

For the best experience, ensure your browser:

- Allows camera access for face recognition
- Has JavaScript enabled
- Supports WebRTC (most modern browsers)
- Is updated to the latest version

### 3. Camera Setup

Ensure your webcam:

- Is properly connected and recognized by your system
- Has good lighting for face recognition
- Is positioned at eye level
- Has clear view of your face

## Testing the Installation

### 1. Backend Health Check

```bash
# Test backend connectivity
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "face_recognition": "ready",
    "totp": "ready"
  }
}
```

### 2. Frontend Connectivity

1. Open `http://localhost:3000` in your browser
2. You should see the login page
3. Try registering a new user
4. Test the face recognition setup

### 3. API Documentation

Access the interactive API documentation at:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Production Deployment

### 1. Backend Production Setup

```bash
# Install production dependencies
pip install gunicorn

# Create production configuration
# gunicorn_config.py
bind = "0.0.0.0:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 2

# Start production server
gunicorn -c gunicorn_config.py main:app
```

### 2. Frontend Production Build

```bash
# Build production version
npm run build

# Serve with a web server (e.g., nginx, Apache)
# The build files will be in the 'build' directory
```

### 3. Database Migration (PostgreSQL)

For production, consider using PostgreSQL:

```bash
# Install PostgreSQL
# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE mfa_attendance;
CREATE USER mfa_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE mfa_attendance TO mfa_user;
\q

# Update .env file
DATABASE_URL=postgresql://mfa_user:secure_password@localhost/mfa_attendance
```

### 4. Environment Security

For production deployment:

1. **Change Default Passwords**: Update all default credentials
2. **Use Strong Secrets**: Generate cryptographically secure secrets
3. **Enable HTTPS**: Use SSL certificates
4. **Configure Firewall**: Restrict access to necessary ports
5. **Regular Updates**: Keep all dependencies updated

## Troubleshooting

### Common Issues

#### 1. Camera Not Working

- **Check Browser Permissions**: Ensure camera access is allowed
- **Check Camera Usage**: Make sure no other application is using the camera
- **Browser Compatibility**: Try a different browser
- **HTTPS Requirement**: Some browsers require HTTPS for camera access

#### 2. Face Recognition Models Not Loading

- **Check Model Files**: Ensure all model files are downloaded
- **Check File Paths**: Verify models are in `public/models/` directory
- **Check Network**: Ensure models can be loaded from the web server
- **Browser Console**: Check for JavaScript errors

#### 3. Database Connection Issues

- **Check Database URL**: Verify the database connection string
- **Check Permissions**: Ensure database user has proper permissions
- **Check Service**: Ensure database service is running
- **Check Firewall**: Ensure database port is accessible

#### 4. API Connection Issues

- **Check Backend Server**: Ensure backend is running on port 8000
- **Check CORS**: Verify CORS configuration allows frontend origin
- **Check Network**: Test network connectivity between frontend and backend
- **Check Logs**: Review backend logs for error messages

### Performance Optimization

#### 1. Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_attendance_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_checkin_time ON attendance_records(check_in_time);
```

#### 2. Caching Implementation

```python
# Add Redis caching (optional)
pip install redis

# Configure caching in config.py
REDIS_URL = "redis://localhost:6379/0"
```

#### 3. Static File Optimization

```bash
# Optimize images and assets
npm install -g imagemin-cli
imagemin public/images/* --out-dir=public/images/optimized
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Database Backups**: Regular database backups
2. **Log Rotation**: Manage log file sizes
3. **Security Updates**: Keep all dependencies updated
4. **Performance Monitoring**: Monitor system performance
5. **User Management**: Regular user account reviews

### Monitoring Setup

```python
# Add monitoring endpoints
@app.get("/metrics")
async def get_metrics():
    return {
        "uptime": time.time() - start_time,
        "users_count": db.query(User).count(),
        "attendance_records": db.query(AttendanceRecord).count()
    }
```

### Backup Procedures

```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump mfa_attendance > backup_${DATE}.sql
```

This setup guide provides comprehensive instructions for deploying and maintaining the MFA Attendance System in both development and production environments.
