import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "attendance.db");

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initSchema(dbInstance);
  }
  return dbInstance;
}

export const getDatabase = getDb;

function initSchema(db: DatabaseSync) {
  // Foreign keys
  db.exec("PRAGMA foreign_keys = ON;");

  // Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'teacher',
      created_at TEXT NOT NULL
    );
  `);

  // Courses
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      course_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Students
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      student_code TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      reference_image_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Enrollments
  db.exec(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);

  // Consents
  db.exec(`
    CREATE TABLE IF NOT EXISTS consents (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      consent_type TEXT NOT NULL,
      granted INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  // Sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'Draft',
      input_mode TEXT NOT NULL DEFAULT 'Simulated classroom session',
      configuration_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);

  // Attendance Records
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      student_id TEXT,
      anonymous_track_id TEXT,
      first_seen TEXT,
      last_seen TEXT,
      observed_duration REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'Unverified',
      source TEXT NOT NULL DEFAULT 'automated_vision',
      manually_corrected INTEGER NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 1.0,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
    );
  `);

  // Engagement Metrics
  db.exec(`
    CREATE TABLE IF NOT EXISTS engagement_metrics (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      interval_start TEXT NOT NULL,
      interval_end TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      confidence REAL NOT NULL DEFAULT 1.0,
      source_modality TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  // Recommendations
  db.exec(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      title TEXT NOT NULL,
      explanation TEXT NOT NULL,
      evidence_json TEXT NOT NULL DEFAULT '{}',
      suggested_action TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 1.0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  // Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      timestamp TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Privacy Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS privacy_settings (
      id TEXT PRIMARY KEY,
      media_retention_hours INTEGER NOT NULL DEFAULT 24,
      auto_delete_recordings INTEGER NOT NULL DEFAULT 1,
      allow_face_detection INTEGER NOT NULL DEFAULT 1,
      allow_audio_analysis INTEGER NOT NULL DEFAULT 1,
      consent_enforced INTEGER NOT NULL DEFAULT 1,
      anonymous_tracks_only INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  // Ensure default privacy settings exist
  const existingPS = db.prepare("SELECT id FROM privacy_settings WHERE id = 'default'").get();
  if (!existingPS) {
    db.prepare(`
      INSERT INTO privacy_settings (id, media_retention_hours, auto_delete_recordings, allow_face_detection, allow_audio_analysis, consent_enforced, anonymous_tracks_only, updated_at)
      VALUES ('default', 24, 1, 1, 1, 1, 0, datetime('now'))
    `).run();
  }
}

export function seedDemoData(forceReset: boolean = false): { status: string; message: string } {
  const db = getDb();

  const checkCourse = db.prepare("SELECT id FROM courses WHERE course_code = 'CS-101'").get();
  if (checkCourse && !forceReset) {
    return { status: "already_seeded", message: "Demo data is already loaded." };
  }

  if (forceReset) {
    db.exec("DELETE FROM audit_logs;");
    db.exec("DELETE FROM recommendations;");
    db.exec("DELETE FROM engagement_metrics;");
    db.exec("DELETE FROM attendance_records;");
    db.exec("DELETE FROM sessions;");
    db.exec("DELETE FROM consents;");
    db.exec("DELETE FROM enrollments;");
    db.exec("DELETE FROM students;");
    db.exec("DELETE FROM courses;");
    db.exec("DELETE FROM users;");
  }

  const now = new Date();
  const dateStr = now.toISOString();

  // 1. Teacher User
  db.prepare(`
    INSERT INTO users (id, display_name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run("user-demo-teacher-01", "Dr. Elena Vance", "elena.vance@university.local", "demo_hash", "teacher", dateStr);

  // 2. Courses
  db.prepare(`
    INSERT INTO courses (id, course_code, name, teacher_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run("course-cs101", "CS-101", "Introduction to Computational Thinking", "user-demo-teacher-01", dateStr);

  db.prepare(`
    INSERT INTO courses (id, course_code, name, teacher_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run("course-data204", "DATA-204", "Data Systems & Analytics", "user-demo-teacher-01", dateStr);

  // 3. Students (14 students)
  const demoStudents = [
    ["STU-1001", "Amara Okafor"],
    ["STU-1002", "Benjamin Chen"],
    ["STU-1003", "Clara Morales"],
    ["STU-1004", "Devon Washington"],
    ["STU-1005", "Emma Lindqvist"],
    ["STU-1006", "Farhan Al-Mansoor"],
    ["STU-1007", "Grace Hopper-Smith"],
    ["STU-1008", "Haruto Tanaka"],
    ["STU-1009", "Isla MacLeod"],
    ["STU-1010", "Jamal Jackson"],
    ["STU-1011", "Kavita Rao"],
    ["STU-1012", "Liam O'Connor"],
    ["STU-1013", "Maya Patel"],
    ["STU-1014", "Noah Tremblay"]
  ];

  const studentIds: string[] = [];

  for (let i = 0; i < demoStudents.length; i++) {
    const [code, name] = demoStudents[i];
    const sId = `stu-demo-${code.toLowerCase()}`;
    studentIds.push(sId);

    db.prepare(`
      INSERT INTO students (id, student_code, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sId, code, name, dateStr, dateStr);

    // Enroll in CS-101
    db.prepare(`
      INSERT INTO enrollments (id, student_id, course_id, status)
      VALUES (?, ?, ?, ?)
    `).run(`enr-cs101-${i+1}`, sId, "course-cs101", "active");

    // Some in DATA-204
    if (i % 2 === 0) {
      db.prepare(`
        INSERT INTO enrollments (id, student_id, course_id, status)
        VALUES (?, ?, ?, ?)
      `).run(`enr-data204-${i+1}`, sId, "course-data204", "active");
    }

    // Consents
    db.prepare(`
      INSERT INTO consents (id, student_id, consent_type, granted, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(`c-vid-${i+1}`, sId, "video_presence", 1, dateStr);

    db.prepare(`
      INSERT INTO consents (id, student_id, consent_type, granted, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(`c-aud-${i+1}`, sId, "audio_activity", 1, dateStr);

    db.prepare(`
      INSERT INTO consents (id, student_id, consent_type, granted, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(`c-id-${i+1}`, sId, "identity_matching", i % 3 === 0 ? 0 : 1, dateStr);
  }

  // 4. Historical Sessions
  const sampleSessions = [
    {
      id: "session-demo-01",
      title: "CS-101 Lecture 1: Algorithms & Flowcharts",
      daysAgo: 7,
      duration: 50
    },
    {
      id: "session-demo-02",
      title: "CS-101 Workshop: Structured Control Flow",
      daysAgo: 3,
      duration: 45
    },
    {
      id: "session-demo-03",
      title: "CS-101 Interactive Lab: Debugging Strategies",
      daysAgo: 1,
      duration: 60
    }
  ];

  for (const s of sampleSessions) {
    const sDate = new Date(Date.now() - s.daysAgo * 86400000);
    const eDate = new Date(sDate.getTime() + s.duration * 60000);

    db.prepare(`
      INSERT INTO sessions (id, course_id, title, start_time, end_time, status, input_mode, configuration_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      s.id,
      "course-cs101",
      s.title,
      sDate.toISOString(),
      eDate.toISOString(),
      "Completed",
      "Simulated classroom session",
      JSON.stringify({ is_demo: true, duration_minutes: s.duration })
    );

    // Seed realistic attendance records
    const statuses = [
      "Present", "Present", "Present", "Present", "Present", "Present",
      "Present", "Present", "Late", "Left early", "Manually confirmed", "Unverified", "Absent", "Present"
    ];

    for (let idx = 0; idx < studentIds.length; idx++) {
      const status = statuses[idx % statuses.length];
      const stuId = status === "Unverified" ? null : studentIds[idx];
      let obsDur = s.duration * 60.0;
      if (status === "Late") obsDur = (s.duration - 12) * 60.0;
      else if (status === "Left early") obsDur = (s.duration - 15) * 60.0;
      else if (status === "Absent") obsDur = 0.0;

      db.prepare(`
        INSERT INTO attendance_records (id, session_id, student_id, anonymous_track_id, first_seen, last_seen, observed_duration, status, source, manually_corrected, confidence)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `att-${s.id}-${idx+1}`,
        s.id,
        stuId,
        `track-${String(idx+1).padStart(2, "0")}`,
        status !== "Absent" ? sDate.toISOString() : null,
        status !== "Absent" ? eDate.toISOString() : null,
        obsDur,
        status,
        "simulated",
        status === "Manually confirmed" ? 1 : 0,
        status === "Unverified" ? 0.72 : 0.95
      );
    }

    // Seed metrics every 5 minutes
    const steps = Math.floor(s.duration / 5);
    for (let step = 0; step < steps; step++) {
      const istart = new Date(sDate.getTime() + step * 5 * 60000);
      const iend = new Date(istart.getTime() + 5 * 60000);

      let pVal = 75.0 + Math.sin(step) * 12.0;
      if (step === 3 || step === 4) pVal -= 18.0; // mid-session dip
      pVal = Math.max(35.0, Math.min(95.0, Math.round(pVal * 10) / 10));

      const mVal = Math.max(30.0, Math.min(90.0, Math.round((pVal - 5.0 + Math.cos(step) * 8.0) * 10) / 10));
      const hVal = Math.max(40.0, Math.min(92.0, Math.round((pVal + 2.0) * 10) / 10));
      const aVal = step % 2 === 0 ? 68.0 : 42.0;

      const score = Math.round((0.35 * pVal + 0.25 * mVal + 0.20 * hVal + 0.20 * aVal) * 10) / 10;

      const metricPairs = [
        ["participation_activity", pVal, "video"],
        ["movement_patterns", mVal, "video"],
        ["head_orientation", hVal, "video"],
        ["audio_activity", aVal, "audio"],
        ["explainable_score", score, "multimodal_fusion"]
      ];

      for (const [mname, mval, mod] of metricPairs) {
        db.prepare(`
          INSERT INTO engagement_metrics (id, session_id, interval_start, interval_end, metric_name, metric_value, confidence, source_modality, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `m-${s.id}-${step}-${mname}`,
          s.id,
          istart.toISOString(),
          iend.toISOString(),
          mname,
          mval,
          0.92,
          mod,
          JSON.stringify({ step })
        );
      }
    }

    // Seed recommendations
    db.prepare(`
      INSERT INTO recommendations (id, session_id, title, explanation, evidence_json, suggested_action, confidence, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `rec-${s.id}-1`,
      s.id,
      "Participation Activity Reduction Detected",
      "Observed visible participation activity declined between minutes 15:00 and 25:00.",
      JSON.stringify({ interval: "15:00 - 25:00", drop_pct: 22 }),
      "Consider introducing a quick peer discussion, poll, or interactive check-in question to re-energize dialogue.",
      0.88,
      "accepted",
      new Date(sDate.getTime() + 25 * 60000).toISOString()
    );

    db.prepare(`
      INSERT INTO recommendations (id, session_id, title, explanation, evidence_json, suggested_action, confidence, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `rec-${s.id}-2`,
      s.id,
      "Extended Continuous Lecture Passage",
      "Continuous vocal presentation has exceeded 35 minutes without a student-led response pause.",
      JSON.stringify({ continuous_speech_mins: 38 }),
      "Conduct a 2-minute synthesis pause or student recap before progressing to new curriculum.",
      0.91,
      "active",
      new Date(sDate.getTime() + 38 * 60000).toISOString()
    );
  }

  // Audit Log
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, timestamp, details_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    "audit-seed-01",
    "user-demo-teacher-01",
    "SEED_DEMO_DATA",
    "SYSTEM",
    null,
    dateStr,
    JSON.stringify({ seeded: "14 students, 2 courses, 3 sessions" })
  );

  return {
    status: "success",
    message: "Demo data initialized successfully with 14 students and 3 verified sessions."
  };
}
