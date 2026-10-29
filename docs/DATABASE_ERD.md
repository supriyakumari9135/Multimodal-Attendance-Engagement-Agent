# Database Entity-Relationship Diagram (ERD)

The database is built on SQLAlchemy and stored in local SQLite (`data/attendance.db`) with foreign key enforcement and cascading deletion policies. The schema is fully compatible with migration to PostgreSQL.

```mermaid
erDiagram
    User ||--o{ Course : "instructs"
    User ||--o{ AuditLog : "initiates"
    Course ||--o{ Enrollment : "has"
    Course ||--o{ Session : "schedules"
    Student ||--o{ Enrollment : "participates_in"
    Student ||--o{ Consent : "grants"
    Student ||--o{ AttendanceRecord : "records"
    Session ||--o{ AttendanceRecord : "captures"
    Session ||--o{ EngagementMetric : "produces"
    Session ||--o{ Recommendation : "generates"

    User {
        string id PK
        string display_name
        string email
        string password_hash
        string role
        datetime created_at
    }

    Course {
        string id PK
        string course_code
        string name
        string teacher_id FK
        datetime created_at
    }

    Student {
        string id PK
        string student_code
        string display_name
        string reference_image_path
        datetime created_at
        datetime updated_at
    }

    Enrollment {
        string id PK
        string student_id FK
        string course_id FK
        string status
    }

    Consent {
        string id PK
        string student_id FK
        string consent_type
        boolean granted
        datetime timestamp
        datetime revoked_at
    }

    Session {
        string id PK
        string course_id FK
        string title
        datetime start_time
        datetime end_time
        string status
        string input_mode
        json configuration_json
    }

    AttendanceRecord {
        string id PK
        string session_id FK
        string student_id FK
        string anonymous_track_id
        datetime first_seen
        datetime last_seen
        float observed_duration
        string status
        string source
        boolean manually_corrected
        float confidence
    }

    EngagementMetric {
        string id PK
        string session_id FK
        datetime interval_start
        datetime interval_end
        string metric_name
        float metric_value
        float confidence
        string source_modality
        json metadata_json
    }

    Recommendation {
        string id PK
        string session_id FK
        string title
        text explanation
        json evidence_json
        text suggested_action
        float confidence
        string status
        datetime created_at
    }

    AuditLog {
        string id PK
        string user_id FK
        string action
        string entity_type
        string entity_id
        datetime timestamp
        json details_json
    }

    PrivacySettings {
        string id PK
        int media_retention_hours
        boolean auto_delete_recordings
        boolean allow_face_detection
        boolean allow_audio_analysis
        boolean consent_enforced
        boolean anonymous_tracks_only
        datetime updated_at
    }
```

