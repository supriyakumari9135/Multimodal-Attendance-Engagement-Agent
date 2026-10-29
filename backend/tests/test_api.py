import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.analytics.engine import calculate_explainable_engagement, detect_significant_shifts
from backend.app.recommendations.engine import RecommendationEngine

client = TestClient(app)

def test_health_capabilities():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["offline_mode"] is True
    assert len(data["capabilities"]) >= 4

def test_seed_demo_data():
    response = client.post("/api/demo/seed")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["success", "already_seeded"]

def test_get_courses_and_students():
    # Fetch courses
    courses_resp = client.get("/api/courses")
    assert courses_resp.status_code == 200
    courses = courses_resp.json()
    assert len(courses) >= 1

    # Fetch students
    students_resp = client.get("/api/students")
    assert students_resp.status_code == 200
    students = students_resp.json()
    assert len(students) >= 12  # Must be at least 12 students as specified

def test_analytics_overview():
    resp = client.get("/api/analytics/overview")
    assert resp.status_code == 200
    stats = resp.json()
    assert "total_enrolled_students" in stats
    assert stats["total_enrolled_students"] >= 12
    assert "average_engagement_score" in stats

def test_explainable_engagement_score_logic():
    # Full modalities
    metrics = {
        "participation_activity": 80.0,
        "movement_patterns": 60.0,
        "head_orientation": 70.0,
        "audio_activity": 50.0
    }
    result = calculate_explainable_engagement(metrics)
    assert result["score"] is not None
    assert 60.0 <= result["score"] <= 80.0
    assert result["status"] == "Calculated"
    assert len(result["available_modalities"]) == 4

    # Missing audio modality: must renormalize weights and NOT assign zero
    metrics_no_audio = {
        "participation_activity": 80.0,
        "movement_patterns": 60.0,
        "head_orientation": 70.0,
        "audio_activity": None
    }
    result_renorm = calculate_explainable_engagement(metrics_no_audio)
    assert result_renorm["score"] is not None
    assert "audio_activity" not in result_renorm["available_modalities"]
    # Check that weights sum to approximately 1.0
    total_w = sum(result_renorm["renormalized_weights"].values())
    assert abs(total_w - 1.0) < 0.01

def test_neutral_insight_detection():
    timeline = [
        {"interval_label": "00:00", "participation_activity": 80.0},
        {"interval_label": "00:05", "participation_activity": 55.0}  # 25% drop
    ]
    insights = detect_significant_shifts(timeline, threshold=15.0)
    assert len(insights) >= 1
    # Ensure wording is neutral and non-judgmental
    assert "decreased" in insights[0]["wording"]
    assert "stopped paying attention" not in insights[0]["wording"]

def test_recommendation_engine():
    timeline = [
        {"participation_activity": 85.0, "movement_patterns": 65.0, "audio_activity": 60.0},
        {"participation_activity": 50.0, "movement_patterns": 40.0, "audio_activity": 50.0}
    ]
    recs = RecommendationEngine.evaluate_session_metrics(
        timeline_metrics=timeline,
        session_duration_minutes=48.0,
        available_modalities=["video", "audio"]
    )
    assert len(recs) >= 1
    titles = [r["title"] for r in recs]
    assert any("Participation" in t or "Pacing" in t for t in titles)

def test_csv_and_pdf_report_generation():
    # Get any session
    sessions_resp = client.get("/api/sessions")
    assert sessions_resp.status_code == 200
    sessions = sessions_resp.json()
    assert len(sessions) > 0
    test_session_id = sessions[0]["id"]

    # Test CSV
    csv_resp = client.get(f"/api/reports/sessions/{test_session_id}/csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "MULTIMODAL ATTENDANCE" in csv_resp.text

    # Test PDF
    pdf_resp = client.get(f"/api/reports/sessions/{test_session_id}/pdf")
    assert pdf_resp.status_code == 200
    assert "application/pdf" in pdf_resp.headers["content-type"]
    assert len(pdf_resp.content) > 500  # Non-empty PDF binary

