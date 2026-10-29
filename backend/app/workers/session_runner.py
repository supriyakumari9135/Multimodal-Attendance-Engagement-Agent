import asyncio
import threading
import time
import random
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pathlib import Path
import cv2

from backend.app.core.database import SessionLocal
from backend.app.models.models import (
    Session as SessionModel, AttendanceRecord, EngagementMetric,
    Recommendation, Student, Enrollment, AuditLog
)
from backend.app.vision.detector import ClassroomVisionPipeline
from backend.app.analytics.engine import calculate_explainable_engagement
from backend.app.recommendations.engine import RecommendationEngine

class LiveSessionState:
    def __init__(self, session_id: str, input_mode: str, config: Dict[str, Any]):
        self.session_id = session_id
        self.input_mode = input_mode
        self.config = config
        self.status = "Running"
        self.start_time = datetime.utcnow()
        self.elapsed_seconds = 0.0
        self.is_paused = False
        self.is_stopped = False
        self.observed_tracks: Dict[str, Dict[str, Any]] = {}
        self.current_metrics: Dict[str, float] = {
            "participation_activity": 72.0,
            "movement_patterns": 65.0,
            "head_orientation": 68.0,
            "audio_activity": 50.0
        }
        self.recent_events: List[Dict[str, Any]] = []
        self.lock = threading.Lock()
        self.vision_pipeline = ClassroomVisionPipeline()


class SessionWorkerManager:
    """
    Manages active live and uploaded video sessions.
    Handles background execution, state transitions, and database sync.
    """
    def __init__(self):
        self.active_sessions: Dict[str, LiveSessionState] = {}
        self.upload_progress: Dict[str, Dict[str, Any]] = {}
        self._bg_thread: Optional[threading.Thread] = None
        self._running = True
        self._start_ticker()

    def _start_ticker(self):
        self._bg_thread = threading.Thread(target=self._ticker_loop, daemon=True)
        self._bg_thread.start()

    def _ticker_loop(self):
        while self._running:
            time.sleep(1.0)
            now = datetime.utcnow()
            for session_id, state in list(self.active_sessions.items()):
                if state.is_stopped:
                    continue
                if state.is_paused:
                    continue

                with state.lock:
                    state.elapsed_seconds += 1.0

                    # If simulated session, deterministically tick simulated students
                    if state.input_mode == "Simulated classroom session":
                        self._tick_simulated_session(state, now)

    def _tick_simulated_session(self, state: LiveSessionState, now: datetime):
        # Fluctuate metrics realistically
        p_delta = (random.random() - 0.48) * 3.0
        m_delta = (random.random() - 0.50) * 4.0
        h_delta = (random.random() - 0.49) * 2.5
        a_delta = (random.random() - 0.50) * 5.0

        state.current_metrics["participation_activity"] = round(max(30.0, min(95.0, state.current_metrics["participation_activity"] + p_delta)), 1)
        state.current_metrics["movement_patterns"] = round(max(25.0, min(92.0, state.current_metrics["movement_patterns"] + m_delta)), 1)
        state.current_metrics["head_orientation"] = round(max(35.0, min(94.0, state.current_metrics["head_orientation"] + h_delta)), 1)
        state.current_metrics["audio_activity"] = round(max(15.0, min(90.0, state.current_metrics["audio_activity"] + a_delta)), 1)

        # Update simulated tracks
        for tid, tinfo in state.observed_tracks.items():
            if tinfo["status"] != "Absent":
                tinfo["observed_duration"] += 1.0
                tinfo["last_seen"] = now.isoformat()
                if tinfo["observed_duration"] >= 30.0 and tinfo["status"] == "Unverified":
                    tinfo["status"] = "Present"
                    state.recent_events.insert(0, {
                        "timestamp": now.strftime("%H:%M:%S"),
                        "message": f"{tinfo.get('student_name', tid)} marked Present (>= 30s threshold reached)",
                        "type": "attendance"
                    })
                    if len(state.recent_events) > 20:
                        state.recent_events.pop()

    def start_session(self, session_id: str, input_mode: str, config: Dict[str, Any]) -> LiveSessionState:
        state = LiveSessionState(session_id, input_mode, config)

        # Seed enrolled students into state for simulated session
        db = SessionLocal()
        try:
            sess = db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if sess:
                sess.status = "Running"
                sess.start_time = datetime.utcnow()
                db.commit()

                # Get enrolled students for the course
                enrollments = db.query(Enrollment).filter(Enrollment.course_id == sess.course_id).all()
                for idx, enr in enumerate(enrollments):
                    stu = db.query(Student).filter(Student.id == enr.student_id).first()
                    if stu:
                        track_id = f"sim-track-{idx+1:02d}"
                        state.observed_tracks[track_id] = {
                            "track_id": track_id,
                            "student_id": stu.id,
                            "student_name": stu.display_name,
                            "student_code": stu.student_code,
                            "status": "Unverified",
                            "first_seen": datetime.utcnow().isoformat(),
                            "last_seen": datetime.utcnow().isoformat(),
                            "observed_duration": 0.0,
                            "confidence": 0.95
                        }
        finally:
            db.close()

        self.active_sessions[session_id] = state
        return state

    def pause_session(self, session_id: str):
        if session_id in self.active_sessions:
            self.active_sessions[session_id].is_paused = True
            self.active_sessions[session_id].status = "Paused"
            db = SessionLocal()
            try:
                sess = db.query(SessionModel).filter(SessionModel.id == session_id).first()
                if sess:
                    sess.status = "Paused"
                    db.commit()
            finally:
                db.close()

    def resume_session(self, session_id: str):
        if session_id in self.active_sessions:
            self.active_sessions[session_id].is_paused = False
            self.active_sessions[session_id].status = "Running"
            db = SessionLocal()
            try:
                sess = db.query(SessionModel).filter(SessionModel.id == session_id).first()
                if sess:
                    sess.status = "Running"
                    db.commit()
            finally:
                db.close()

    def stop_session(self, session_id: str):
        if session_id in self.active_sessions:
            state = self.active_sessions[session_id]
            state.is_stopped = True
            state.status = "Completed"

            # Sync records to database
            db = SessionLocal()
            try:
                sess = db.query(SessionModel).filter(SessionModel.id == session_id).first()
                if sess:
                    sess.status = "Completed"
                    sess.end_time = datetime.utcnow()

                    # Save attendance records
                    for tid, tinfo in state.observed_tracks.items():
                        # Check if record exists
                        att = db.query(AttendanceRecord).filter(
                            AttendanceRecord.session_id == session_id,
                            AttendanceRecord.student_id == tinfo.get("student_id")
                        ).first()

                        if not att:
                            att = AttendanceRecord(
                                session_id=session_id,
                                student_id=tinfo.get("student_id"),
                                anonymous_track_id=tinfo.get("track_id"),
                                observed_duration=tinfo.get("observed_duration", 0.0),
                                status=tinfo.get("status", "Present"),
                                source="simulated" if state.input_mode == "Simulated classroom session" else "automated_vision",
                                confidence=tinfo.get("confidence", 0.95)
                            )
                            db.add(att)
                        else:
                            att.observed_duration = tinfo.get("observed_duration", 0.0)
                            att.status = tinfo.get("status", "Present")

                    # Generate metrics & recommendations
                    duration_mins = max(1.0, state.elapsed_seconds / 60.0)
                    now = datetime.utcnow()
                    fused = calculate_explainable_engagement(state.current_metrics)
                    score_val = fused["score"] if fused["score"] is not None else 70.0

                    db.add(EngagementMetric(
                        session_id=session_id,
                        interval_start=now - timedelta(minutes=duration_mins),
                        interval_end=now,
                        metric_name="explainable_score",
                        metric_value=score_val,
                        confidence=0.92,
                        source_modality="multimodal_fusion",
                        metadata_json={"live_duration_seconds": state.elapsed_seconds}
                    ))

                    # Check recommendations
                    recs = RecommendationEngine.evaluate_session_metrics(
                        [state.current_metrics],
                        duration_mins,
                        ["video", "audio"]
                    )
                    for r in recs:
                        db.add(Recommendation(
                            session_id=session_id,
                            title=r["title"],
                            explanation=r["explanation"],
                            evidence_json=r["evidence_json"],
                            suggested_action=r["suggested_action"],
                            confidence=r["confidence"],
                            status="active"
                        ))

                    db.commit()
            finally:
                db.close()

    def finalize_session(self, session_id: str):
        self.stop_session(session_id)
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]

    async def process_video_upload_task(self, session_id: str, video_path: str):
        """
        Background task to process uploaded classroom video file.
        Updates self.upload_progress[session_id] for real-time frontend polling.
        """
        self.upload_progress[session_id] = {
            "status": "processing",
            "progress_pct": 0,
            "processed_frames": 0,
            "total_frames": 0,
            "message": "Initializing video decoder..."
        }

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            self.upload_progress[session_id] = {
                "status": "failed",
                "progress_pct": 0,
                "message": "Unable to read uploaded video format."
            }
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        sample_step = max(1, int(fps * 1.0))  # Sample at 1 fps
        
        pipeline = ClassroomVisionPipeline()
        start_time = datetime.utcnow()
        frame_idx = 0
        sampled_count = 0
        timeline_metrics = []

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_step == 0:
                sampled_count += 1
                curr_ts = start_time + timedelta(seconds=frame_idx / fps)
                metrics = pipeline.process_frame(frame, curr_ts, dt=1.0)
                timeline_metrics.append(metrics)

                pct = min(99, int((frame_idx / float(max(1, total_frames))) * 100))
                self.upload_progress[session_id] = {
                    "status": "processing",
                    "progress_pct": pct,
                    "processed_frames": frame_idx,
                    "total_frames": total_frames,
                    "active_tracks": len(pipeline.active_tracks),
                    "message": f"Analyzing frame {frame_idx} of {total_frames}..."
                }

            frame_idx += 1
            await asyncio.sleep(0.001)

        cap.release()

        # Save results to DB
        db = SessionLocal()
        try:
            sess = db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if sess:
                sess.status = "Completed"
                sess.end_time = datetime.utcnow()

                # Save tracks as attendance
                all_tracks = list(pipeline.active_tracks.values()) + pipeline.completed_tracks
                for t in all_tracks:
                    status = "Present" if t.observed_duration_seconds >= 30.0 else "Unverified"
                    db.add(AttendanceRecord(
                        session_id=session_id,
                        anonymous_track_id=t.track_id,
                        first_seen=t.first_seen,
                        last_seen=t.last_seen,
                        observed_duration=t.observed_duration_seconds,
                        status=status,
                        source="automated_vision",
                        confidence=0.88
                    ))

                # Aggregate timeline into 5-min intervals
                if timeline_metrics:
                    avg_p = sum(m["participation_activity"] for m in timeline_metrics) / len(timeline_metrics)
                    avg_m = sum(m["movement_patterns"] for m in timeline_metrics) / len(timeline_metrics)
                    fused = calculate_explainable_engagement({
                        "participation_activity": avg_p,
                        "movement_patterns": avg_m
                    })
                    score = fused["score"] or 65.0

                    db.add(EngagementMetric(
                        session_id=session_id,
                        interval_start=start_time,
                        interval_end=datetime.utcnow(),
                        metric_name="explainable_score",
                        metric_value=round(score, 1),
                        confidence=0.88,
                        source_modality="multimodal_fusion",
                        metadata_json={"frames_processed": sampled_count}
                    ))

                db.commit()
        finally:
            db.close()

        self.upload_progress[session_id] = {
            "status": "completed",
            "progress_pct": 100,
            "processed_frames": frame_idx,
            "total_frames": total_frames,
            "message": "Video analysis complete. Metrics and attendance recorded."
        }


session_worker_manager = SessionWorkerManager()

