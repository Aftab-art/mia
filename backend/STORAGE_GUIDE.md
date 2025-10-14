# Storage Management Guide

## Overview

This guide explains how to manage storage for face images and attendance records to prevent database from filling up.

## Current Storage Usage

- **Face Images**: Stored in `attendance_records.face_image` (base64 encoded)
- **Average Size**: ~10-30 KB per image
- **Growth Rate**: ~1-5 MB per user per month (with daily check-ins)

---

## 🛠️ Cleanup Methods

### Method 1: Command Line Tool (Recommended)

#### Show Storage Statistics

```bash
python cleanup_storage.py stats
```

#### Interactive Mode

```bash
python cleanup_storage.py
```

Then choose from the menu:

1. Show storage statistics
2. Remove face images older than X days (keep attendance data)
3. Delete entire records older than X days
4. Clean up specific user's old records
5. Emergency: Delete ALL face images
6. Exit

#### Quick Commands

```bash
# Remove images older than 90 days (keep attendance data)
python cleanup_storage.py cleanup 90

# Delete entire records older than 90 days
python cleanup_storage.py delete 90
```

### Method 2: API Endpoints (Admin Only)

#### Get Storage Statistics

```http
GET /api/storage/stats
Authorization: Bearer <admin_token>
```

Response:

```json
{
  "total_records": 100,
  "records_with_images": 85,
  "records_without_images": 15,
  "total_size_bytes": 2500000,
  "total_size_kb": 2441.41,
  "total_size_mb": 2.38,
  "average_image_size_kb": 28.71,
  "database_file_size_mb": 3.5,
  "oldest_record": "2024-01-01T10:00:00",
  "newest_record": "2024-10-14T16:22:07",
  "days_span": 287
}
```

#### Clean Up Old Records

```http
POST /api/storage/cleanup
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "days_to_keep": 90,
  "delete_records": false,
  "user_id": null
}
```

Parameters:

- `days_to_keep`: Keep records newer than this many days
- `delete_records`:
  - `false` = Remove only face images (default)
  - `true` = Delete entire attendance records
- `user_id`: Optional. If provided, only cleanup this user's records

Response:

```json
{
  "success": true,
  "message": "Successfully cleaned 45 records",
  "records_processed": 45,
  "space_freed_mb": 1.25,
  "action": "removed_images"
}
```

#### Emergency: Delete ALL Face Images

```http
DELETE /api/storage/all-images
Authorization: Bearer <admin_token>
```

⚠️ **WARNING**: This deletes ALL face images from ALL attendance records!

---

## 📋 Cleanup Strategies

### Strategy 1: Keep Recent Images Only (Recommended)

- **What**: Remove face images older than 90 days
- **Keeps**: All attendance data (times, duration, etc.)
- **Removes**: Only the face_image field
- **Best for**: Normal operations

```bash
python cleanup_storage.py cleanup 90
```

### Strategy 2: Delete Old Records Completely

- **What**: Delete entire attendance records older than 1 year
- **Keeps**: Recent attendance history
- **Removes**: Old records entirely
- **Best for**: Long-term storage management

```bash
python cleanup_storage.py delete 365
```

### Strategy 3: User-Specific Cleanup

- **What**: Clean up specific user's old data
- **Keeps**: Other users' data
- **Best for**: Managing storage for inactive users

```bash
# Interactive mode, choose option 4
python cleanup_storage.py
```

### Strategy 4: Emergency Cleanup

- **What**: Delete ALL face images immediately
- **Keeps**: All attendance records
- **Best for**: Critical storage situations

```bash
# Interactive mode, choose option 5
python cleanup_storage.py
```

---

## 🤖 Automated Cleanup

### Windows Task Scheduler

Create a scheduled task to run cleanup automatically:

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Attendance Storage Cleanup"
4. Trigger: Daily at 2:00 AM
5. Action: Start a program
   - Program: `C:\path\to\backend\venv\Scripts\python.exe`
   - Arguments: `cleanup_storage.py cleanup 90`
   - Start in: `C:\path\to\backend`

### Linux/Mac Cron Job

Add to crontab (`crontab -e`):

```bash
# Run cleanup daily at 2 AM
0 2 * * * cd /path/to/backend && ./venv/bin/python cleanup_storage.py cleanup 90
```

### Python Script (Background Service)

```python
from apscheduler.schedulers.background import BackgroundScheduler

def cleanup_job():
    import subprocess
    subprocess.run(['python', 'cleanup_storage.py', 'cleanup', '90'])

scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_job, 'cron', hour=2, minute=0)  # Daily at 2 AM
scheduler.start()
```

---

## 📊 Storage Projections

### Per User (Daily Check-In)

- **Daily**: ~20-30 KB
- **Weekly**: ~140-210 KB
- **Monthly**: ~600-900 KB
- **Yearly**: ~7-11 MB

### For 100 Users

- **Monthly**: ~60-90 MB
- **Yearly**: ~700 MB - 1.1 GB

### For 1000 Users

- **Monthly**: ~600-900 MB
- **Yearly**: ~7-11 GB

---

## ⚙️ Configuration

### Adjust Cleanup Frequency

Edit the automated task to run:

- **Daily**: More aggressive, keeps storage low
- **Weekly**: Less frequent, more data retained
- **Monthly**: Minimal cleanup, maximum data retention

### Adjust Retention Period

Change `days_to_keep` parameter:

- **30 days**: Aggressive, minimal storage
- **90 days**: Recommended, balanced
- **180 days**: Conservative, more history
- **365 days**: Maximum retention

---

## 🔍 Troubleshooting

### Database Still Large After Cleanup

Run VACUUM to reclaim space (SQLite):

```bash
sqlite3 mfa_attendance.db "VACUUM;"
```

### Can't Delete Old Records

Check if:

1. You have admin privileges
2. Records exist in the date range
3. Database is not locked

### Need to Recover Space Immediately

Use emergency cleanup:

```bash
python cleanup_storage.py
# Choose option 5: Emergency cleanup
```

---

## 📝 Best Practices

1. **Regular Cleanup**: Run weekly or monthly
2. **Monitor Storage**: Check stats regularly
3. **Backup First**: Always backup before major cleanup
4. **Test First**: Try with small `days_to_keep` value first
5. **Keep Logs**: Save cleanup logs for audit trail

---

## ❓ FAQ

**Q: Will cleanup affect attendance reports?**
A: No, attendance data (times, duration) is kept. Only face images are removed.

**Q: Can I recover deleted images?**
A: No, deletion is permanent. Always backup first.

**Q: How often should I run cleanup?**
A: Weekly or monthly, depending on storage constraints.

**Q: Will this affect current check-ins?**
A: No, only old records are affected. Current operations continue normally.

**Q: Can regular users delete their own data?**
A: No, only admins can perform cleanup operations.

---

## 📞 Support

For help with storage management:

1. Check this guide
2. Run `python cleanup_storage.py stats` to diagnose
3. Contact system administrator
