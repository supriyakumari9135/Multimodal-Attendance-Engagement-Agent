import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.models.models import (
    User, Course, Student, Enrollment, Consent, Session as SessionModel,
    AttendanceRecord, EngagementMetric, Recommendation, AuditLog, PrivacySettings
)

def init_db():
    Base.metadata.create_all(bind=engine)
    # Ensure default privacy settings exist
    db = SessionLocal()
    try:
        ps = db.query(PrivacySettings).filter(PrivacySettings.id == "default").first()
        if not ps:
            ps = PrivacySettings(
                id="default",
                media_retention_hours=24,
                auto_delete_recordings=True,
                allow_face_detection=True,
                allow_audio_analysis=True,
                consent_enforced=True,
                anonymous_tracks_only=False
            )
            db.add(ps)
            db.commit()
    finally:
        db.close()

def seed_demo_data(db: Session, force_reset: bool = False):
    random.seed(42)  # Deterministic seed as specified

    if force_reset:
        # Wipe all records safely
        db.query(AuditLog).delete()
        db.query(Recommendation).delete()
        db.query(EngagementMetric).delete()
        db.query(AttendanceRecord).delete()
        db.query(SessionModel).delete()
        db.query(Consent).delete()
        db.query(Enrollment).delete()
        db.query(Student).delete()
        db.query(Course).delete()
        db.query(User).delete()
        db.commit()
    else:
        # Check if already seeded
        if db.query(Course).filter(Course.course_code == "CS-101").first():
            return {"status": "already_seeded", "message": "Demo data is already loaded."}

    # 1. Create Default Teacher User
    teacher = User(
        id="user-demo-teacher-01",
        display_name="Dr. Elena Vance",
        email="elena.vance@university.local",
        password_hash="demo_local_hash",
        role="teacher"
    )
    db.add(teacher)
    db.flush()

    # 2. Create Sample Courses
    course_cs101 = Course(
        id="course-cs101",
        course_code="CS-101",
        name="Introduction to Computational Thinking",
        teacher_id=teacher.id
    )
    course_data204 = Course(
        id="course-data204",
        course_code="DATA-204",
        name="Data Systems & Analytics",
        teacher_id=teacher.id
    )
    db.add_all([course_cs101, course_data204])
    db.flush()

    # 3. Create at least 14 Students (requirement is at least 12)
    demo_students = [
        ("STU-1001", "Amara Okafor"),
        ("STU-1002", "Benjamin Chen"),
        ("STU-1003", "Clara Morales"),
        ("STU-1004", "Devon Washington"),
        ("STU-1005", "Emma Lindqvist"),
        ("STU-1006", "Farhan Al-Mansoor"),
        ("STU-1007", "Grace Hopper-Smith"),
        ("STU-1008", "Haruto Tanaka"),
        ("STU-1009", "Isla MacLeod"),
        ("STU-1010", "Jamal Jackson"),
        ("STU-1011", "Kavita Rao"),
        ("STU-1012", "Liam O'Connor"),
        ("STU-1013", "Maya Patel"),
        ("STU-1014", "Noah Tremblay"),
    ]

    student_objs = []
    now = datetime.utcnow()

    for code, name in demo_students:
        stu = Student(
            student_code=code,
            display_name=name,
            created_at=now - timedelta(days=30),
            updated_at=now - timedelta(days=30)
        )
        db.add(stu)
        db.flush()
        student_objs.append(stu)

        # Enroll in CS-101
        db.add(Enrollment(student_id=stu.id, course_id=course_cs101.id, status="active"))
        # Enroll some in DATA-204
        if int(code.split("-")[1]) % 2 == 0:
            db.add(Enrollment(student_id=stu.id, course_id=course_data204.id, status="active"))

        # Explicit Consent Records
        db.add(Consent(
            student_id=stu.id,
            consent_type="video_presence",
            granted=True,
            timestamp=now - timedelta(days=30)
        ))
        db.add(Consent(
            student_id=stu.id,
            consent_type="audio_activity",
            granted=True,
            timestamp=now - timedelta(days=30)
        ))
        db.add(Consent(
            student_id=stu.id,
            consent_type="identity_matching",
            granted=(int(code.split("-")[1]) % 3 != 0),  # Some opt out of biometric identity matching
            timestamp=now - timedelta(days=30)
        ))

    db.flush()

    # 4. Create Historical Sessions
    session_configs = [
        {
            "id": "session-demo-01",
            "title": "CS-101 Lecture 1: Algorithms & Flowcharts",
            "course_id": course_cs101.id,
            "days_ago": 7,
            "duration_mins": 50,
            "status": "Completed"
        },
        {
            "id": "session-demo-02",
            "title": "CS-101 Workshop: Structured Control Flow",
            "course_id": course_cs101.id,
            "days_ago": 3,
            "duration_mins": 45,
            "status": "Completed"
        },
        {
            "id": "session-demo-03",
            "title": "CS-101 Interactive Lab: Debugging Strategies",
            "course_id": course_cs101.id,
            "days_ago": 1,
            "duration_mins": 60,
            "status": "Completed"
        }
    ]

    for sc in session_configs:
        start_time = now - timedelta(days=sc["days_ago"], hours=2)
        end_time = start_time + timedelta(minutes=sc["duration_mins"])

        sess = SessionModel(
            id=sc["id"],
            course_id=sc["course_id"],
            title=sc["title"],
            start_time=start_time,
            end_time=end_time,
            status=sc["status"],
            input_mode="Simulated classroom session",
            configuration_json={
                "sample_rate_fps": 1.0,
                "min_duration_seconds": 30.0,
                "weights": {
                    "participation_activity": 0.35,
                    "movement_patterns": 0.25,
                    "head_orientation": 0.20,
                    "audio_activity": 0.20
                },
                "is_demo_session": True
            }
        )
        db.add(sess)
        db.flush()

        # Seed attendance records for this session
        # Ensure a realistic distribution: Most present, 1 late, 1 left early, 1 unverified, 1 absent
        statuses = ["Present", "Present", "Present", "Present", "Present", "Present", "Present", "Present", "Late", "Left early", "Manually confirmed", "Unverified", "Absent", "Present"]
        
        for idx, stu in enumerate(student_objs):
            status = statuses[idx % len(statuses)]
            obs_duration = sc["duration_mins"] * 60.0
            if status == "Late":
                obs_duration = (sc["duration_mins"] - 12) * 60.0
                first_seen = start_time + timedelta(minutes=12)
                last_seen = end_time
            elif status == "Left early":
                obs_duration = (sc["duration_mins"] - 15) * 60.0
                first_seen = start_time
                last_seen = start_time + timedelta(minutes=sc["duration_mins"] - 15)
            elif status == "Absent":
                obs_duration = 0.0
                first_seen = None
                last_seen = None
            else:
                first_seen = start_time + timedelta(seconds=random.randint(5, 30))
                last_seen = end_time - timedelta(seconds=random.randint(5, 30))

            att = AttendanceRecord(
                session_id=sess.id,
                student_id=stu.id if status != "Unverified" else None,
                anonymous_track_id=f"track-{idx+1:02d}",
                first_seen=first_seen,
                last_seen=last_seen,
                observed_duration=obs_duration,
                status=status,
                source="simulated",
                manually_corrected=(status == "Manually confirmed"),
                confidence=0.94 if status != "Unverified" else 0.72
            )
            db.add(att)

        # Seed engagement metrics across 5-minute intervals
        interval_count = sc["duration_mins"] // 5
        for step in range(interval_count):
            istart = start_time + timedelta(minutes=step * 5)
            iend = istart + timedelta(minutes=5)

            # Generate realistic fluctuating curve
            base_p = 75.0 + 10.0 * (random.random() - 0.5)
            if step in [3, 4]:  # Mid-session dip (explanation: long lecture passage)
                base_p -= 22.0
            elif step in [6, 7]:  # Lab activity rebound
                base_p += 14.0

            p_val = max(35.0, min(95.0, base_p))
            m_val = max(30.0, min(90.0, p_val + (random.random() - 0.5) * 12))
            h_val = max(40.0, min(92.0, p_val + (random.random() - 0.5) * 10))
            a_val = max(20.0, min(85.0, 45.0 + 35.0 * (random.random() if step % 2 == 0 else 0.2)))

            # Explainable fused score
            fused = 0.35 * p_val + 0.25 * m_val + 0.20 * h_val + 0.20 * a_val

            for mname, mval, mod in [
                ("participation_activity", p_val, "video"),
                ("movement_patterns", m_val, "video"),
                ("head_orientation", h_val, "video"),
                ("audio_activity", a_val, "audio"),
                ("explainable_score", fused, "multimodal_fusion")
            ]:
                db.add(EngagementMetric(
                    session_id=sess.id,
                    interval_start=istart,
                    interval_end=iend,
                    metric_name=mname,
                    metric_value=round(mval, 1),
                    confidence=0.92,
                    source_modality=mod,
                    metadata_json={"window_minutes": 5, "active_tracks": 12}
                ))

        # Seed recommendations
        db.add(Recommendation(
            session_id=sess.id,
            title="Participation Activity Reduction Detected",
            explanation="Observed visible participation activity declined from 78% to 54% between minutes 15:00 and 25:00.",
            evidence_json={
                "time_interval": "15:00 - 25:00",
                "drop_percentage": 24.0,
                "signals": ["movement_patterns", "participation_activity"]
            },
            suggested_action="Consider introducing a quick peer discussion, poll, or interactive check-in question to re-energize dialogue.",
            confidence=0.88,
            status="accepted" if sc["days_ago"] > 2 else "active",
            created_at=start_time + timedelta(minutes=25)
        ))

        db.add(Recommendation(
            session_id=sess.id,
            title="Extended Monologue Interval",
            explanation="Audio activity indicated continuous one-way speech for over 18 minutes without open student discussion.",
            evidence_json={
                "time_interval": "05:00 - 23:00",
                "continuous_speech_minutes": 18.2,
                "signals": ["audio_activity"]
            },
            suggested_action="Session pacing suggests a 2-minute synthesis pause or quick student-led concept recap.",
            confidence=0.91,
            status="active",
            created_at=start_time + timedelta(minutes=24)
        ))

    # Audit log entry for seeding
    db.add(AuditLog(
        user_id=teacher.id,
        action="SEED_DEMO_DATA",
        entity_type="SYSTEM",
        entity_id=None,
        timestamp=now,
        details_json={"action": "Seeded 14 students, 2 courses, 3 historical sessions with metrics."}
    ))

    db.commit()
    return {"status": "success", "message": "Demo data initialized successfully with 14 students and 3 sessions."}
