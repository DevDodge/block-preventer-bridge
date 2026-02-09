# Migration Script: Fix Auto-Pause Issue

## Quick Fix

If your profiles keep getting paused automatically, run this script:

```bash
# Make sure you're in the backend directory
cd backend

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Run the fix
python fix_auto_pause.py
```

## What it does

1. Sets `auto_pause_on_failures = False` for all packages
2. Resumes all auto-paused profiles
3. Shows a detailed report

## After running

1. Restart your backend server
2. Mark old alerts as read in the UI
3. Try sending messages again

## See also

- `FIX_AUTO_PAUSE_ISSUE.md` (in root directory) - Detailed troubleshooting guide
- `PRODUCTION_READY_GUIDE.md` - Complete production guide
