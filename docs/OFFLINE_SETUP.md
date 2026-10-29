# Offline Setup & Deployment Guide

This guide details how to install and run the **Multimodal Attendance & Engagement Agent** in an environment that operates without an ongoing internet connection.

---

## 1. Prerequisites (Prepared Once Before Going Offline)

- **Python 3.11+** (Python 3.12 verified)
- **Node.js v18+** (Node v24 verified with npm 11+)
- **Windows / macOS / Linux**

---

## 2. Initial Setup (One-Time Preparation)

### Step 1: Clone or Extract the Repository
```bash
git clone <repository_url> multimodal-attendance-agent
cd multimodal-attendance-agent
```

### Step 2: Initialize Python Virtual Environment & Install Packages
```bash
python -m venv venv

# Windows
.\venv\Scripts\pip install -r backend/requirements.txt

# Linux / macOS
./venv/bin/pip install -r backend/requirements.txt
```

### Step 3: Install Frontend Dependencies & Build
```bash
cd frontend
npm install
npm run build
cd ..
```

---

## 3. Offline Operation Verification

Once the dependencies are installed and the initial build is complete, **no internet connection is required**:
- Models run locally via OpenCV (`cv2.HOGDescriptor`, Haar cascades).
- Audio energy calculations run on local PCM buffers via NumPy.
- Databases run against local SQLite (`data/attendance.db`).
- Pedagogical suggestions are generated deterministically by local rule evaluations.
- PDF generation runs locally via ReportLab.
- No external LLM keys or third-party cloud APIs are called.

---

## 4. Starting the Application

### Option A: Using the Windows Scripts
- Double-click `scripts\run_all.bat` or run:
```powershell
.\scripts\run_all.bat
```

### Option B: Using Individual Terminal Commands

**Terminal 1 (Backend):**
```powershell
.\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```

### Option C: Using Make
```bash
make install
make backend
make frontend
```

---

## 5. Demonstration Workflow

1. Navigate to `http://localhost:3000`.
2. Click **"Load Demo Data"** in the top-right header to seed sample courses (`CS-101`, `DATA-204`) and 14 students.
3. Open **"Live Session"** from the left navigation.
4. Select **"Simulated Classroom"** or **"Live Camera"**, review the privacy checklist, and click **"Start Session"**.
5. Observe live tracking duration updates, threshold verification events ($\ge 30$ seconds), and real-time metric gauges.
6. Click **"Stop Session"** followed by **"Finalize & Save"**.
7. Open **"Engagement Analytics"** to inspect explainable trend charts, weight contributions, and neutral interval insights.
8. Navigate to **"Reports"** to download official CSV and PDF session reports.

