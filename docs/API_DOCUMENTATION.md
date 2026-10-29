# API Documentation: Multimodal Attendance & Engagement Agent

The backend exposes a full suite of REST endpoints operating under `/api`. Interactive OpenAPI documentation is accessible at `http://localhost:8000/api/docs`.

---

## 1. Health & Capabilities

### `GET /api/health`
Returns the application health status, offline-readiness flag, and module availability.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-10-29T03:00:00Z",
  "version": "1.0.0",
  "offline_mode": true,
  "capabilities": [
    {
      "name": "OpenCV Video Frame Decoding",
      "available": true,
      "status_detail": "OpenCV Headless loaded successfully for local video/frame processing.",
      "is_offline_ready": true
    },
    {
      "name": "Explainable Rule-based Teaching Assistant",
      "available": true,
      "status_detail": "Deterministic recommendation engine online. No LLM or cloud API required.",
      "is_offline_ready": true
    }
  ]
}
```

---

## 2. Demo Management

### `POST /api/demo/seed`
Seeds 14 demo students, 2 sample courses, 3 historical sessions with attendance records, and synthetic 5-minute interval metrics.

### `POST /api/demo/reset`
Wipes and cleanly re-seeds deterministic demonstration data using a fixed random seed ($42$).

---

## 3. Courses & Students

### `GET /api/courses`
Lists all courses with active enrollment count and total sessions count.

### `POST /api/courses`
Creates a course.
```json
{
  "course_code": "CS-101",
  "name": "Introduction to Computational Thinking"
}
```

### `GET /api/students`
Lists students. Supports query parameters:
- `search` (filter by student code or display name)
- `course_id` (filter by course)

### `POST /api/students/import`
Multi-part form upload for roster CSV files.
- Form fields: `file` (.csv), `course_id` (optional string)
- Returns row-level validation errors and counts.

---

## 4. Sessions & Live Runner

### `GET /api/sessions`
Returns sessions sorted by date.

### `POST /api/sessions`
Creates a session.
```json
{
  "course_id": "course-cs101",
  "title": "Algorithms & Flowcharts",
  "input_mode": "Simulated classroom session",
  "planned_duration_minutes": 45
}
```

### `POST /api/sessions/{session_id}/start`
Starts session processing and initializes background worker.

### `POST /api/sessions/{session_id}/pause`
Pauses the active session.

### `POST /api/sessions/{session_id}/resume`
Resumes a paused session.

### `POST /api/sessions/{session_id}/stop`
Stops session time accumulation and synchronizes records to SQLite.

### `POST /api/sessions/{session_id}/finalize`
Finalizes the session and clears background worker memory.

---

## 5. Attendance & Processing

### `GET /api/sessions/{session_id}/attendance`
Retrieves timestamped attendance records for the session.

### `PATCH /api/sessions/{session_id}/attendance/{record_id}`
Manual teacher correction. Updates the attendance record status and logs an entry in `audit_logs`.
```json
{
  "status": "Manually confirmed",
  "notes": "Student attended in-person outside camera field."
}
```

---

## 6. Analytics & Recommendations

### `GET /api/analytics/overview`
Aggregated institutional statistics: enrolled count, active sessions, attendance rate, and average engagement.

### `GET /api/analytics/sessions/{session_id}`
Returns the 5-minute interval timeline points, modality breakdowns, and neutral shifts.

### `GET /api/sessions/{session_id}/recommendations`
Returns rule-based suggestions with time interval, confidence, and suggested actions.

---

## 7. Reports & Document Export

### `GET /api/reports/sessions/{session_id}/csv`
Downloads full attendance register and metrics summary in CSV format.

### `GET /api/reports/sessions/{session_id}/pdf`
Downloads a formatted PDF report with executive summary and methodology disclaimer.

---

## 8. Privacy & Data Purge

### `GET /api/privacy/settings`
Returns media retention hours and sensor permission flags.

### `POST /api/privacy/delete-session-data?session_id={id}`
Permanently removes uploaded media from the filesystem and anonymizes attendance identifiers.

