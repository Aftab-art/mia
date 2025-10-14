# Backend Installation Fix

## Problem: ModuleNotFoundError: No module named 'distutils'

This error occurs because:

1. Python 3.12+ removed the `distutils` module
2. Some packages (especially `face-recognition`) still depend on it
3. The `setuptools` package now provides the functionality

## Solutions (try in order):

### Solution 1: Quick Fix

```bash
cd backend
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
```

### Solution 2: Use Setup Script

```bash
cd backend
python setup.py
```

### Solution 3: Alternative Requirements (if face-recognition fails)

```bash
cd backend
python -m pip install -r requirements-alternative.txt
```

### Solution 4: Manual Installation (if all else fails)

```bash
cd backend

# Install core dependencies first
python -m pip install fastapi uvicorn sqlalchemy python-dotenv
python -m pip install python-jose[cryptography] passlib[bcrypt] pyotp
python -m pip install opencv-python pillow numpy
python -m pip install qrcode[pil] pydantic pydantic-settings

# Skip face-recognition for now (optional feature)
# python -m pip install face-recognition  # This might fail

# Install remaining dependencies
python -m pip install pandas python-dateutil pytz
python -m pip install httpx email-validator aiofiles
```

### Solution 5: Use Docker (Recommended for Production)

```bash
# Create Dockerfile (if not exists)
# Then run:
docker build -t mfa-backend .
docker run -p 8000:8000 mfa-backend
```

## System-Specific Fixes

### Windows

```bash
# Install Visual Studio Build Tools first
# Then:
python -m pip install --upgrade pip setuptools wheel
python -m pip install cmake
python -m pip install -r requirements.txt
```

### macOS

```bash
# Install Xcode command line tools
xcode-select --install

# Then:
python -m pip install --upgrade pip setuptools wheel
python -m pip install cmake
python -m pip install -r requirements.txt
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3-dev python3-pip build-essential cmake
sudo apt install libopencv-dev python3-opencv
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
```

## Test Installation

```bash
cd backend
python -c "import fastapi; print('✅ FastAPI installed')"
python -c "import sqlalchemy; print('✅ SQLAlchemy installed')"
python -c "import cv2; print('✅ OpenCV installed')"
python -c "import pyotp; print('✅ PyOTP installed')"
```

## If Face Recognition Still Fails

The system will work without face recognition. You can:

1. Use only TOTP for MFA
2. Install face recognition later when you have time
3. Use the webcam-based face detection in the frontend instead

## Need Help?

If you're still having issues:

1. Check your Python version: `python --version`
2. Make sure you're using the correct pip: `python -m pip --version`
3. Try creating a virtual environment: `python -m venv venv`
4. Activate it: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Unix)
5. Then try the installation again
