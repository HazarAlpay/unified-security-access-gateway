# 🚀 Quick Setup Guide

This guide will help you get the Unified Security Access Gateway up and running in minutes.

## 📋 Prerequisites

- **Python 3.12+** (for backend)
- **Node.js 18+** and **npm** (for frontend)
- **Git** (to clone the repository)

---

## 🔧 Backend Setup

### 1. Navigate to Backend Directory
```bash
cd unified-security-access-gateway/backend
```

### 2. Create Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 4. Initialize Database
The database will be created automatically when you first run the server. Or you can run:
```bash
python init_db.py
```

### 5. Seed Test Users (Optional)
Create test users for development:
```bash
python seed.py
```

This creates users like:
- `admin` / `admin123`
- `employee1` / `user123`
- `john` / `john123`
- etc.

To clear existing users and start fresh:
```bash
python seed.py --clear
```

### 6. Create Admin User (Alternative)
If you prefer to create an admin manually:
```bash
python create_admin.py
```

---

## 🎨 Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd unified-security-access-gateway/frontend
```

### 2. Install Node Dependencies
```bash
npm install
```

---

## ▶️ Running the Application

### Start Backend Server
```bash
# From backend directory
cd unified-security-access-gateway/backend
uvicorn main:app --reload
```

Backend will run on: **http://localhost:8000**

### Start Frontend Server
```bash
# From frontend directory (in a new terminal)
cd unified-security-access-gateway/frontend
npm run dev
```

Frontend will run on: **http://localhost:5173** (or similar port)

---

## 🛠️ Utility Scripts

### Unban IP Address
If you accidentally ban your own IP:
```bash
cd unified-security-access-gateway/backend
python unban_ip.py
```

**Options:**
- Interactive mode: `python unban_ip.py` (shows menu)
- List banned IPs: `python unban_ip.py --list`
- Unban specific IP: `python unban_ip.py --ip 127.0.0.1`
- Unban all IPs: `python unban_ip.py --all`

### Reset Database (NIST Migration)
Reset database and seed with NIST rules:
```bash
cd unified-security-access-gateway/backend
python migrate_nist.py
```

⚠️ **Warning:** This will delete all existing data!

---

## 🔐 First Login

1. Open **http://localhost:5173** in your browser
2. Login with one of the test users:
   - **Admin:** `admin` / `admin123`
   - **Employee:** `employee1` / `user123`
3. Complete MFA setup on first login (scan QR code with authenticator app)

---

## ⚙️ Environment Variables (Optional)

Create a `.env` file in the `backend` directory for production settings:

```env
# JWT Secret Key (change this!)
USAG_SECRET_KEY=your-secret-key-here

# Token Expiration (minutes)
USAG_TOKEN_EXPIRE_MINUTES=30

# Google reCAPTCHA (optional - leave empty for development)
RECAPTCHA_SECRET_KEY=your-recaptcha-secret
```

For frontend, create `.env` in `frontend` directory:
```env
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

**Note:** The app works without these for development/testing.

---

## 🐛 Troubleshooting

### Port Already in Use
- Backend: Change port in `uvicorn main:app --reload --port 8001`
- Frontend: Vite will automatically use the next available port

### Database Errors
- Delete `backend/security_gateway.db` and restart the server
- Or run `python init_db.py` to recreate

### Module Not Found
- Make sure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend Build Errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

---

## 📚 Next Steps

- Check the main [README.md](README.md) for detailed feature documentation
- Explore the admin dashboard for security management
- Test the ban IP feature (but remember to unban yourself!)
- Review security rules in the Security Rules page

---

## 💡 Tips

- **Development Mode:** Both servers support hot-reload (auto-refresh on code changes)
- **Test Users:** Use `seed.py` to quickly populate test data
- **IP Banning:** Be careful not to ban your own IP! Use `unban_ip.py` if you do.
- **MFA:** Use any authenticator app (Google Authenticator, Authy, Microsoft Authenticator)

---

**Happy Coding! 🎉**

