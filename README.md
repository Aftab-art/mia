# Multi-Factor Authentication System with Attendance Tracking

## Project Overview
A comprehensive software-based Multi-Factor Authentication (MFA) system that integrates facial recognition via webcam, TOTP (Time-based One-Time Passwords), and attendance tracking functionality.

## Technology Stack

### Frontend
- **React 18** with JSX
- **face-api.js** for webcam-based facial recognition
- **Material-UI** for modern UI components
- **QR Code** generation for TOTP setup
- **WebRTC** for camera access

### Backend
- **FastAPI** (Python) for REST API
- **SQLAlchemy** for database operations
- **OpenCV** for face detection and recognition
- **PyOTP** for TOTP generation and validation
- **JWT** for secure authentication tokens
- **bcrypt** for password hashing

### Database
- **SQLite** (development) / **PostgreSQL** (production)

## Features

### Authentication Methods
1. **Username/Password** (Primary factor)
2. **Facial Recognition** via webcam (Secondary factor)
3. **TOTP** (Google Authenticator compatible) (Tertiary factor)
4. **Email/SMS OTP** (Backup factor)

### Attendance System
- **Check-in/Check-out** with facial verification
- **Time tracking** and attendance reports
- **Location-based** attendance (optional)
- **Real-time** attendance dashboard

## Security Features
- **JWT-based** authentication
- **bcrypt** password hashing
- **Rate limiting** for login attempts
- **Session management** with expiration
- **Encrypted** biometric data storage
- **CORS** protection
- **Input validation** and sanitization

## Installation & Setup

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/verify-face` - Facial recognition verification
- `POST /auth/verify-totp` - TOTP verification
- `POST /auth/setup-totp` - TOTP setup

### Attendance
- `POST /attendance/checkin` - Check-in with face verification
- `POST /attendance/checkout` - Check-out with face verification
- `GET /attendance/reports` - Attendance reports

## Project Structure
```
mia/
├── backend/
│   ├── main.py
│   ├── models/
│   ├── routers/
│   ├── services/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── public/
├── docs/
│   ├── research.md
│   ├── architecture.md
│   └── security.md
└── README.md
```

## Research & References
- Face-api.js: https://github.com/justadudewhohacks/face-api.js
- FastAPI Documentation: https://fastapi.tiangolo.com/
- OpenCV Face Recognition: https://docs.opencv.org/
- TOTP RFC: https://tools.ietf.org/html/rfc6238

## Security Recommendations
1. **Multi-layered authentication** for enhanced security
2. **Regular security audits** and penetration testing
3. **Data encryption** for biometric templates
4. **Privacy compliance** (GDPR, CCPA)
5. **Regular backup** of attendance data
6. **Network security** with HTTPS and firewalls
