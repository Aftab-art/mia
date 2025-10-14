"""
Setup script for the MFA Attendance System Backend
This script helps resolve common installation issues including distutils problems
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    print(f"🐍 Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ is required")
        return False
    elif version.major == 3 and version.minor >= 12:
        print("⚠️  Python 3.12+ detected - using alternative installation method")
        return "alternative"
    else:
        print("✅ Python version is compatible")
        return True

def install_requirements(use_alternative=False):
    """Install requirements with error handling"""
    if use_alternative:
        requirements_file = "requirements-alternative.txt"
        print("\n🔧 Using alternative requirements file for better compatibility")
    else:
        requirements_file = "requirements.txt"
    
    # First, upgrade pip and install essential tools
    commands = [
        "python -m pip install --upgrade pip",
        "python -m pip install --upgrade setuptools wheel",
        f"python -m pip install -r {requirements_file}"
    ]
    
    for command in commands:
        if not run_command(command, f"Running: {command}"):
            if "face-recognition" in command or "dlib" in command:
                print("\n⚠️  Face recognition library installation failed.")
                print("This is common on some systems. The system will work without it.")
                print("You can install it later manually if needed.")
                continue
            else:
                return False
    
    return True

def create_env_file():
    """Create .env file from example if it doesn't exist"""
    env_file = Path(".env")
    env_example = Path("env.example")
    
    if not env_file.exists() and env_example.exists():
        print("\n📝 Creating .env file from example...")
        with open(env_example, 'r') as f:
            content = f.read()
        with open(env_file, 'w') as f:
            f.write(content)
        print("✅ .env file created")
    elif env_file.exists():
        print("✅ .env file already exists")
    else:
        print("⚠️  No env.example file found")

def main():
    """Main setup function"""
    print("🚀 Setting up MFA Attendance System Backend")
    print("=" * 50)
    
    # Check Python version
    python_check = check_python_version()
    if python_check is False:
        sys.exit(1)
    
    # Determine which requirements to use
    use_alternative = python_check == "alternative"
    
    # Install requirements
    if not install_requirements(use_alternative):
        print("\n❌ Installation failed. Please check the errors above.")
        print("\n💡 Troubleshooting tips:")
        print("1. Make sure you have Python 3.8+ installed")
        print("2. Try running: python -m pip install --upgrade pip setuptools wheel")
        print("3. For face recognition issues, try: pip install cmake")
        print("4. On Windows, you might need Visual Studio Build Tools")
        sys.exit(1)
    
    # Create .env file
    create_env_file()
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Update the .env file with your configuration")
    print("2. Run: python main.py")
    print("3. The API will be available at http://localhost:8000")

if __name__ == "__main__":
    main()
