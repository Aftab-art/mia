# MFA Attendance System - Backend

Multi-Factor Authentication (MFA) Attendance System backend built with FastAPI, SQLAlchemy, and Python.

## Features

- 🔐 **Multi-Factor Authentication** - TOTP and Face Recognition
- 👤 **User Management** - Registration, login, profile management
- ⏰ **Attendance Tracking** - Check-in/check-out with timestamps
- 📊 **Analytics** - Attendance reports and statistics
- 🔒 **Security** - JWT tokens, password hashing, rate limiting
- 📱 **QR Code TOTP** - Google Authenticator compatible
- 🎭 **Face Recognition** - Software-based facial authentication
- 📝 **Audit Logs** - Login attempts and security events

## Quick Start

```bash
# Clone repository
git clone https://github.com/Aftab-art/mia.git
cd mia/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# Setup environment
copy env.example .env  # Edit .env with your settings

# Run backend
python main.py
```

Server will start at `http://localhost:8000`

## Installation

See [INSTALLATION.md](INSTALLATION.md) for detailed installation instructions.

## Verification

Test your installation:

```bash
python verify_installation.py
```

## Requirements

- Python 3.8+ (Tested on Python 3.12.7)
- pip (latest version)
- Virtual environment (recommended)

### Core Dependencies

- FastAPI - Modern web framework
- Uvicorn - ASGI server
- SQLAlchemy - Database ORM
- Pydantic - Data validation
- PyOTP - TOTP implementation
- Python-JOSE - JWT authentication
- Passlib - Password hashing

See [requirements.txt](requirements.txt) for complete list.

## Configuration

Create a `.env` file in the backend directory:

```env
DATABASE_URL=sqlite:///./mfa_attendance.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=http://localhost:3000
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

See [env.example](env.example) for all available options.

## API Documentation

Once running, access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/setup-totp` - Setup TOTP
- `POST /auth/verify-totp` - Verify TOTP code
- `POST /auth/setup-face` - Setup face recognition
- `POST /auth/verify-face` - Verify face

### Attendance
- `POST /attendance/check-in` - Check in
- `POST /attendance/check-out` - Check out
- `GET /attendance/today` - Today's attendance
- `GET /attendance/history` - Attendance history
- `GET /attendance/summary` - Attendance summary

### Admin
- `GET /admin/users` - List all users
- `GET /admin/dashboard` - Admin dashboard stats
- `GET /admin/user/{id}` - Get user details
- `PUT /admin/user/{id}` - Update user
- `DELETE /admin/user/{id}` - Delete user

## Project Structure

```
backend/
├── main.py                 # Application entry point
├── config.py              # Configuration settings
├── database.py            # Database configuration
├── models.py              # SQLAlchemy models
├── requirements.txt       # Python dependencies
├── env.example            # Environment variables example
├── routers/              # API route handlers
│   ├── auth.py           # Authentication routes
│   ├── attendance.py     # Attendance routes
│   ├── admin.py          # Admin routes
│   └── storage.py        # Storage management
├── services/             # Business logic
│   ├── auth_service.py   # Authentication service
│   └── attendance_service.py  # Attendance service
└── verify_installation.py  # Installation verification script
```

## Database

The application uses SQLite by default for development.

For production, use PostgreSQL:

```env
DATABASE_URL=postgresql://user:password@localhost/dbname
```

### Models

- **User** - User accounts and authentication
- **AttendanceRecord** - Check-in/check-out records
- **LoginAttempt** - Login attempt logs
- **SecurityEvent** - Security event logs

## Development

### Running Tests

```bash
pytest
```

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head
```

### Code Formatting

```bash
black .
isort .
```

## Production Deployment

### Using Gunicorn

```bash
pip install gunicorn
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Using Docker

```bash
docker build -t mfa-backend .
docker run -p 8000:8000 mfa-backend
```

### Environment Variables for Production

- Set `DEBUG=False`
- Use strong `SECRET_KEY`
- Use PostgreSQL instead of SQLite
- Configure CORS properly
- Enable HTTPS
- Set up monitoring and logging

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ TOTP two-factor authentication
- ✅ Face recognition (software-based)
- ✅ Rate limiting
- ✅ Account lockout after failed attempts
- ✅ Security event logging
- ✅ CORS configuration
- ✅ Input validation with Pydantic

## Troubleshooting

### Common Issues

1. **ModuleNotFoundError**
   - Ensure virtual environment is activated
   - Run `pip install -r requirements.txt`

2. **Database errors**
   - Delete `mfa_attendance.db` and restart
   - Check DATABASE_URL in `.env`

3. **Port already in use**
   - Change PORT in `.env`
   - Or kill process using port 8000

4. **Import errors**
   - Run `python verify_installation.py`
   - Check Python version: `python --version`

See [INSTALLATION.md](INSTALLATION.md) for more troubleshooting steps.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License

This project is for educational purposes.

## Support

For issues and questions:
- Check [INSTALLATION.md](INSTALLATION.md)
- Review API documentation at `/docs`
- Check error logs in terminal

## Related

- [Frontend README](../frontend/README.md) - React frontend documentation
- [Project Documentation](../docs/) - Additional documentation
