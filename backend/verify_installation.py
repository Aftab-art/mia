#!/usr/bin/env python3
"""
Installation Verification Script
Run this script after installing requirements to verify everything is working.
"""

import sys
from importlib import import_module

def check_package(package_name, import_name=None):
    """Check if a package can be imported"""
    if import_name is None:
        import_name = package_name
    
    try:
        import_module(import_name)
        print(f"✅ {package_name:<30} - OK")
        return True
    except ImportError as e:
        print(f"❌ {package_name:<30} - FAILED: {e}")
        return False

def check_python_version():
    """Check Python version"""
    version = sys.version_info
    print(f"\n🐍 Python Version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ is required")
        return False
    else:
        print("✅ Python version is compatible")
        return True

def main():
    """Main verification function"""
    print("=" * 60)
    print("MFA Attendance System - Installation Verification")
    print("=" * 60)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    print("\n📦 Checking Essential Packages:")
    print("-" * 60)
    
    essential_packages = [
        ("FastAPI", "fastapi"),
        ("Uvicorn", "uvicorn"),
        ("SQLAlchemy", "sqlalchemy"),
        ("Python-JOSE", "jose"),
        ("Passlib", "passlib"),
        ("PyOTP", "pyotp"),
        ("QRCode", "qrcode"),
        ("Pillow", "PIL"),
        ("Pydantic", "pydantic"),
        ("Pydantic Settings", "pydantic_settings"),
        ("Python-Dotenv", "dotenv"),
        ("Python-Multipart", "multipart"),
        ("HTTPX", "httpx"),
        ("Email Validator", "email_validator"),
        ("Aiofiles", "aiofiles"),
        ("Pandas", "pandas"),
        ("NumPy", "numpy"),
        ("Python-Dateutil", "dateutil"),
        ("Pytz", "pytz"),
        ("Setuptools", "setuptools"),
    ]
    
    failed = []
    for display_name, import_name in essential_packages:
        if not check_package(display_name, import_name):
            failed.append(display_name)
    
    print("\n📦 Checking Optional Packages:")
    print("-" * 60)
    
    optional_packages = [
        ("OpenCV", "cv2"),
        ("Face Recognition", "face_recognition"),
        ("Twilio", "twilio"),
        ("Redis", "redis"),
        ("Celery", "celery"),
        ("Jinja2", "jinja2"),
    ]
    
    for display_name, import_name in optional_packages:
        check_package(display_name, import_name)
    
    # Summary
    print("\n" + "=" * 60)
    if failed:
        print(f"❌ Installation Incomplete - {len(failed)} package(s) missing:")
        for pkg in failed:
            print(f"   - {pkg}")
        print("\nRun: pip install -r requirements.txt")
        sys.exit(1)
    else:
        print("✅ All essential packages installed successfully!")
        print("\n✨ Next steps:")
        print("   1. Create .env file from env.example")
        print("   2. Run: python main.py")
        print("   3. Access API docs at: http://localhost:8000/docs")
    
    print("=" * 60)

if __name__ == "__main__":
    main()

