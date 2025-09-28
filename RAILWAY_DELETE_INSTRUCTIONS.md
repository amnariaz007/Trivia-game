# Railway User Deletion Instructions

## 🎯 Goal
Delete all 98 users except your number (923196612416) for testing

## 📋 Steps

### 1. Upload Script to Railway
- Upload `backend/scripts/railway-delete-users.js` to your Railway backend

### 2. Run on Railway
Choose one of these methods:

#### Option A: Railway CLI (if you have it)
```bash
railway run node scripts/railway-delete-users.js
```

#### Option B: SSH into Railway
```bash
# SSH into your Railway backend
# Then run:
node scripts/railway-delete-users.js
```

#### Option C: Railway Dashboard
- Go to Railway dashboard
- Open your backend service
- Use the terminal/console feature
- Run: `node scripts/railway-delete-users.js`

## ✅ What Will Happen
- ✅ Keep: code schode (923196612416)
- 🗑️ Delete: 98 other users
- 📁 Backup: All users safely backed up locally

## 🔄 To Restore Later
Run this locally to restore all 98 users:
```bash
cd backend
node scripts/restore-users-via-api.js
```

## 🚀 After Deletion
- Test the timer fixes with your number only
- Create test games
- Verify no duplicate questions
- Test with 200+ simulated users

## 📞 Your Number
- **WhatsApp**: 923196612416
- **Nickname**: code schode
- **Status**: Will remain active

---
**Ready to proceed? Upload the script and run it on Railway!**
