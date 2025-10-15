# Backend Installation Guide

## Prerequisites

- **Python**: Version 3.8 or higher (Tested on Python 3.12.7)
- **pip**: Latest version
- **Git**: For cloning the repository

## Quick Start Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/Aftab-art/mia.git
cd mia/backend
```

### Step 2: Create Virtual Environment (Recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### Step 3: Upgrade pip and Install Build Tools

```bash
python -m pip install --upgrade pip setuptools wheel
```

### Step 4: Install Requirements

```bash
pip install -r requirements.txt
```

### Step 5: Set Up Environment Variables

```bash
# Copy the example environment file
copy env.example .env    # Windows
cp env.example .env      # macOS/Linux

# Edit .env file with your configuration
# Use any text editor to modify the values
```

### Step 6: Run the Backend

```bash
python main.py
```

The server will start on `http://localhost:8000`

## Verification

After installation, verify everything is working:

```bash
# Test imports
python -c "import fastapi; print('✅ FastAPI installed')"
python -c "import sqlalchemy; print('✅ SQLAlchemy installed')"
python -c "import pyotp; print('✅ PyOTP installed')"
python -c "import qrcode; print('✅ QRCode installed')"
python -c "from pydantic_settings import BaseSettings; print('✅ Pydantic Settings installed')"
```

## Troubleshooting

### Issue 1: "ModuleNotFoundError: No module named 'fastapi'"

**Solution**: Make sure you're in the virtual environment and run:

```bash
pip install -r requirements.txt
```

### Issue 2: "ModuleNotFoundError: No module named 'distutils'"

**Solution**: Install/upgrade setuptools:

```bash
pip install --upgrade setuptools wheel
```

### Issue 3: "Cannot import 'setuptools.build_meta'"

**Solution**: Upgrade pip and setuptools:

```bash
python -m pip install --upgrade pip setuptools wheel
```

### Issue 4: Package installation fails

**Solution**: Try installing packages individually:

```bash
pip install fastapi uvicorn sqlalchemy python-dotenv
pip install python-jose[cryptography] passlib[bcrypt] pyotp
pip install python-multipart pillow qrcode[pil]
pip install pandas python-dateutil pytz httpx
pip install email-validator aiofiles pydantic-settings
```

### Issue 5: "No module named 'pydantic_settings'"

**Solution**: Install pydantic-settings:

```bash
pip install pydantic-settings
```

## Package List Summary

### Essential Packages (Auto-installed)

- fastapi - Web framework
- uvicorn - ASGI server
- sqlalchemy - Database ORM
- python-jose - JWT authentication
- passlib - Password hashing
- pyotp - TOTP implementation
- qrcode - QR code generation
- pydantic-settings - Settings management
- pillow - Image processing
- pandas - Data handling
- httpx - HTTP client
- email-validator - Email validation
- aiofiles - Async file operations

### Optional Packages (Not installed by default)

- opencv-python - Computer vision (compatibility issues with Python 3.12)
- face-recognition - Face recognition (compatibility issues with Python 3.12)
- twilio - SMS notifications
- redis - Caching
- celery - Task queue

## Environment Variables

Create a `.env` file in the backend directory with these variables:

```env
# Database Configuration
DATABASE_URL=sqlite:///./mfa_attendance.db

# JWT Configuration
SECRET_KEY=your-secret-key-here-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Settings (Frontend URL)
FRONTEND_URL=http://localhost:3000

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# Security Settings
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
```

## Running the Backend

### Development Mode

```bash
python main.py
```

### Production Mode (with Gunicorn)

```bash
pip install gunicorn
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## API Documentation

Once the server is running, access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Database Setup

The application uses SQLite by default. On first run, it will automatically:

1. Create the database file
2. Create all required tables
3. Be ready for use

For PostgreSQL in production, update `DATABASE_URL` in `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost/dbname
```

## Testing Installation

Test the backend is working:

```bash
# In a new terminal (keep backend running)
curl http://localhost:8000/docs
```

You should see the API documentation page.

## Next Steps

1. Start the frontend development server (see `frontend/README.md`)
2. Test user registration at http://localhost:3000/register
3. Set up MFA (TOTP or Face Recognition)
4. Test attendance tracking

## Support

If you encounter any issues:

1. Check you're using Python 3.8+
2. Ensure virtual environment is activated
3. Verify all packages installed: `pip list`
4. Check `.env` file exists and has correct values
5. Review error logs in terminal

## Production Deployment

For production deployment:

1. Set `DEBUG=False` in `.env`
2. Use strong `SECRET_KEY`
3. Use PostgreSQL instead of SQLite
4. Enable HTTPS
5. Set up proper CORS origins
6. Use production ASGI server (Gunicorn with Uvicorn workers)
7. Set up monitoring and logging

## Updates

To update dependencies:

```bash
pip install --upgrade -r requirements.txt
```

## Uninstallation

To remove the virtual environment:

```bash
# Deactivate virtual environment
deactivate

# Delete virtual environment folder
rm -rf venv    # macOS/Linux
rmdir /s venv  # Windows
```
