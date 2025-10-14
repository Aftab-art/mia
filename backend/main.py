from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import uvicorn
from contextlib import asynccontextmanager

from database import engine, get_db
from models import Base
from routers import auth, attendance, admin, storage
from services.auth_service import AuthService
from config import settings

# Create database tables
Base.metadata.create_all(bind=engine)

security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting MFA Attendance System...")
    print(f"📊 Database: {settings.DATABASE_URL}")
    print(f"🔐 JWT Secret: {'*' * 20}")
    yield
    # Shutdown
    print("🛑 Shutting down MFA Attendance System...")

app = FastAPI(
    title="MFA Attendance System",
    description="Multi-Factor Authentication with Facial Recognition and Attendance Tracking",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(storage.router, prefix="/api/storage", tags=["Storage Management"])

@app.get("/")
async def root():
    return {
        "message": "MFA Attendance System API",
        "version": "1.0.0",
        "status": "active",
        "endpoints": {
            "auth": "/api/auth",
            "attendance": "/api/attendance",
            "admin": "/api/admin",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "services": {
            "database": "connected",
            "face_recognition": "ready",
            "totp": "ready"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
