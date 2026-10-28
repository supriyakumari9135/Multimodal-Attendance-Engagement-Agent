from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Health schemas
class CapabilityStatus(BaseModel):
    name: str
    available: bool
    status_detail: str
    is_offline_ready: bool

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    offline_mode: bool
    capabilities: List[CapabilityStatus]

# User schemas
class UserBase(BaseModel):
    display_name: str
    email: str
    role: str = "teacher"

class UserCreate(UserBase):
    password: Optional[str] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Course schemas
class CourseBase(BaseModel):
    course_code: str
    name: str
    teacher_id: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    course_code: Optional[str] = None
    name: Optional[str] = None

class CourseResponse(CourseBase):
    id: str
    created_at: datetime
    enrolled_count: Optional[int] = 0
    sessions_count: Optional[int] = 0
    class Config:
        from_attributes = True

# Consent schemas
class ConsentBase(BaseModel):
    consent_type: str
    granted: bool

class ConsentResponse(ConsentBase):
    id: str
    student_id: str
    timestamp: datetime
    revoked_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# Student schemas
class StudentBase(BaseModel):
    student_code: str
    display_name: str

class StudentCreate(StudentBase):
    course_ids: Optional[List[str]] = []
    consents: Optional[Dict[str, bool]] = None

class StudentUpdate(BaseModel):
    student_code: Optional[str] = None
    display_name: Optional[str] = None
    course_ids: Optional[List[str]] = None
    consents: Optional[Dict[str, bool]] = None

class StudentResponse(StudentBase):
    id: str
    reference_image_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    courses: Optional[List[str]] = []
    consents: Optional[Dict[str, bool]] = {}
    class Config:
        from_attributes = True

class StudentImportRowError(BaseModel):
    row: int
    student_code: Optional[str] = None
    display_name: Optional[str] = None
    error: str

class StudentImportResult(BaseModel):
    total_processed: int
    imported_count: int
    updated_count: int
    errors: List[StudentImportRowError]

# Session schemas
class SessionBase(BaseModel):
    course_id: str
    title: str
    input_mode: str = "Simulated classroom session"
    configuration_json: Optional[Dict[str, Any]] = Field(default_factory=dict)

class SessionCreate(SessionBase):
    planned_duration_minutes: Optional[int] = 45

class SessionResponse(SessionBase):
    id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    attendance_rate: Optional[float] = 0.0
    engagement_average: Optional[float] = 0.0
    total_records: Optional[int] = 0
    class Config:
        from_attributes = True

# Attendance schemas
class AttendanceRecordBase(BaseModel):
    student_id: Optional[str] = None
    anonymous_track_id: Optional[str] = None
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    observed_duration: float = 0.0
    status: str = "Unverified"
    source: str = "automated_vision"
    manually_corrected: bool = False
    confidence: float = 1.0

class AttendanceRecordCorrection(BaseModel):
    status: str  # Present, Late, Left early, Unverified, Manually confirmed, Absent
    student_id: Optional[str] = None
    notes: Optional[str] = None

class AttendanceRecordResponse(AttendanceRecordBase):
    id: str
    session_id: str
    student_name: Optional[str] = None
    student_code: Optional[str] = None
    class Config:
        from_attributes = True

# Engagement Metric schemas
class EngagementMetricBase(BaseModel):
    interval_start: datetime
    interval_end: datetime
    metric_name: str
    metric_value: float
    confidence: float = 1.0
    source_modality: str
    metadata_json: Optional[Dict[str, Any]] = Field(default_factory=dict)

class EngagementMetricResponse(EngagementMetricBase):
    id: str
    session_id: str
    class Config:
        from_attributes = True

# Recommendation schemas
class RecommendationResponse(BaseModel):
    id: str
    session_id: str
    title: str
    explanation: str
    evidence_json: Dict[str, Any]
    suggested_action: str
    confidence: float
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class RecommendationStatusUpdate(BaseModel):
    status: str  # active, accepted, dismissed, completed

# Privacy settings schemas
class PrivacySettingsResponse(BaseModel):
    media_retention_hours: int
    auto_delete_recordings: bool
    allow_face_detection: bool
    allow_audio_analysis: bool
    consent_enforced: bool
    anonymous_tracks_only: bool
    updated_at: datetime
    class Config:
        from_attributes = True

class PrivacySettingsUpdate(BaseModel):
    media_retention_hours: Optional[int] = None
    auto_delete_recordings: Optional[bool] = None
    allow_face_detection: Optional[bool] = None
    allow_audio_analysis: Optional[bool] = None
    consent_enforced: Optional[bool] = None
    anonymous_tracks_only: Optional[bool] = None

# Analytics schemas
class OverviewStats(BaseModel):
    total_enrolled_students: int
    active_courses_count: int
    total_sessions_count: int
    selected_session_present: int
    selected_session_attendance_pct: float
    current_session_duration_minutes: float
    average_engagement_score: float
    recent_participation_activity: float
    teaching_recommendation_count: int
    is_demo_mode: bool

class SessionAnalyticsTimeline(BaseModel):
    session_id: str
    session_title: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: float
    explainable_engagement_score: float
    weights_applied: Dict[str, float]
    available_modalities: List[str]
    timeline_points: List[Dict[str, Any]]
    attendance_summary: Dict[str, int]
    insights: List[Dict[str, Any]]
