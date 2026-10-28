import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Float, Integer, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    display_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(20), default="teacher", nullable=False)  # teacher, admin
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    courses = relationship("Course", back_populates="teacher", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    teacher_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    teacher = relationship("User", back_populates="courses")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="course", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_code = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(150), nullable=False)
    reference_image_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    consents = relationship("Consent", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="active", nullable=False)  # active, dropped, archived

    student = relationship("Student", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class Consent(Base):
    __tablename__ = "consents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    consent_type = Column(String(50), nullable=False)  # video_presence, identity_matching, audio_activity
    granted = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    student = relationship("Student", back_populates="consents")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)
    status = Column(String(20), default="Draft", nullable=False)  # Draft, Ready, Running, Paused, Processing, Completed, Failed
    input_mode = Column(String(30), default="Simulated classroom session", nullable=False)  # Live camera, Uploaded video, Simulated classroom session
    configuration_json = Column(JSON, default=dict, nullable=False)

    course = relationship("Course", back_populates="sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")
    engagement_metrics = relationship("EngagementMetric", back_populates="session", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True)
    anonymous_track_id = Column(String(50), nullable=True)
    first_seen = Column(DateTime, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    observed_duration = Column(Float, default=0.0, nullable=False)  # in seconds
    status = Column(String(30), default="Unverified", nullable=False)  # Present, Late, Left early, Unverified, Manually confirmed, Absent
    source = Column(String(50), default="automated_vision", nullable=False)  # automated_vision, manual_entry, simulated
    manually_corrected = Column(Boolean, default=False, nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)

    session = relationship("Session", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")


class EngagementMetric(Base):
    __tablename__ = "engagement_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    interval_start = Column(DateTime, nullable=False)
    interval_end = Column(DateTime, nullable=False)
    metric_name = Column(String(50), nullable=False, index=True)  # participation_activity, movement_patterns, head_orientation, audio_activity, explainable_score
    metric_value = Column(Float, nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)
    source_modality = Column(String(30), nullable=False)  # video, audio, multimodal_fusion, simulated
    metadata_json = Column(JSON, default=dict, nullable=False)

    session = relationship("Session", back_populates="engagement_metrics")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    explanation = Column(Text, nullable=False)
    evidence_json = Column(JSON, default=dict, nullable=False)
    suggested_action = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)
    status = Column(String(20), default="active", nullable=False)  # active, accepted, dismissed, completed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("Session", back_populates="recommendations")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    details_json = Column(JSON, default=dict, nullable=False)

    user = relationship("User", back_populates="audit_logs")


class PrivacySettings(Base):
    __tablename__ = "privacy_settings"

    id = Column(String(36), primary_key=True, default="default")
    media_retention_hours = Column(Integer, default=24, nullable=False)
    auto_delete_recordings = Column(Boolean, default=True, nullable=False)
    allow_face_detection = Column(Boolean, default=True, nullable=False)
    allow_audio_analysis = Column(Boolean, default=True, nullable=False)
    consent_enforced = Column(Boolean, default=True, nullable=False)
    anonymous_tracks_only = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
