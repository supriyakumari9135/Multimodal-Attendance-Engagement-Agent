from typing import List, Dict, Any, Optional
from datetime import datetime

class RecommendationEngine:
    """
    Local, deterministic teaching recommendation engine.
    Operates 100% offline without requiring internet, external APIs, or LLMs.
    Evaluates rule sets against stored metrics and session dynamics.
    """

    @staticmethod
    def evaluate_session_metrics(
        timeline_metrics: List[Dict[str, Any]],
        session_duration_minutes: float,
        available_modalities: List[str]
    ) -> List[Dict[str, Any]]:
        recommendations = []

        if not timeline_metrics:
            return recommendations

        # Rule 1: Sensor / Modality Check
        if "audio" not in available_modalities and "video" in available_modalities:
            recommendations.append({
                "title": "Audio Modality Inactive",
                "explanation": "Session analysis is currently operating solely on visual indicators. Classroom vocal interaction is not being measured.",
                "evidence_json": {
                    "missing_modality": "audio",
                    "available_modalities": available_modalities,
                    "confidence_impact": "Medium"
                },
                "suggested_action": "If microphone access is desired and permitted, enable audio capture in session settings to gauge vocal exchange.",
                "confidence": 0.95,
                "supporting_metric": "modality_availability"
            })

        # Extract metric arrays
        p_vals = [m.get("participation_activity") for m in timeline_metrics if m.get("participation_activity") is not None]
        m_vals = [m.get("movement_patterns") for m in timeline_metrics if m.get("movement_patterns") is not None]
        a_vals = [m.get("audio_activity") for m in timeline_metrics if m.get("audio_activity") is not None]

        # Rule 2: Sudden Participation Decline
        if len(p_vals) >= 2:
            for i in range(1, len(p_vals)):
                diff = p_vals[i-1] - p_vals[i]
                if diff >= 20.0:
                    start_min = (i - 1) * 5
                    end_min = i * 5
                    recommendations.append({
                        "title": "Participation Activity Decline Detected",
                        "explanation": f"Observed participation indicator declined by {round(diff, 1)}% between minutes {start_min}:00 and {end_min}:00.",
                        "evidence_json": {
                            "time_interval": f"{start_min}:00 - {end_min}:00",
                            "drop_percentage": round(diff, 1),
                            "prior_value": p_vals[i-1],
                            "current_value": p_vals[i]
                        },
                        "suggested_action": "Consider introducing an open-ended prompt, polling question, or 2-minute think-pair-share exercise.",
                        "confidence": 0.88,
                        "supporting_metric": "participation_activity"
                    })
                    break  # Avoid spamming duplicates

        # Rule 3: Prolonged Low Movement Interval (with ethical nuance)
        if len(m_vals) >= 3:
            # Check if last 3 intervals (15 mins) have low movement
            recent_m = m_vals[-3:]
            if all(v < 40.0 for v in recent_m):
                recommendations.append({
                    "title": "Extended Low Physical Movement",
                    "explanation": "A prolonged 15-minute interval of low movement was observed. Note: Students may be taking notes, reading quietly, or listening intently.",
                    "evidence_json": {
                        "average_movement": round(sum(recent_m) / len(recent_m), 1),
                        "duration_minutes": 15
                    },
                    "suggested_action": "If this was an active lecture rather than silent reading, consider inviting students to stretch, write on the board, or stand for an activity.",
                    "confidence": 0.82,
                    "supporting_metric": "movement_patterns"
                })

        # Rule 4: Pacing & Long Continuous Lecture
        if session_duration_minutes >= 40.0:
            recommendations.append({
                "title": "Session Pacing: Review & Synthesis Break",
                "explanation": f"The session has reached {int(session_duration_minutes)} continuous minutes. Cognitive retention naturally declines after 40-45 minutes of continuous presentation.",
                "evidence_json": {
                    "session_duration_minutes": session_duration_minutes,
                    "recommended_break_cycle": 45
                },
                "suggested_action": "Conduct a 3-minute synthesis check-in or quick comprehension recap before proceeding to new content.",
                "confidence": 0.90,
                "supporting_metric": "session_duration"
            })

        # Rule 5: Audio Monologue vs. Dialogue
        if a_vals and len(a_vals) >= 3:
            avg_audio = sum(a_vals) / len(a_vals)
            if avg_audio > 75.0 and len(a_vals) >= 4:
                recommendations.append({
                    "title": "Extended Continuous Vocal Activity",
                    "explanation": "Continuous vocal activity has persisted at high levels without pauses or conversational breaks.",
                    "evidence_json": {
                        "average_audio_activity": round(avg_audio, 1),
                        "modality": "audio"
                    },
                    "suggested_action": "Pause for 30-60 seconds of silent reflection to allow students to digest complex points and formulate questions.",
                    "confidence": 0.85,
                    "supporting_metric": "audio_activity"
                })
            elif avg_audio < 25.0:
                recommendations.append({
                    "title": "Low Classroom Audio Activity",
                    "explanation": "Audio level has remained low. This appropriately reflects independent study, exam, or writing phases.",
                    "evidence_json": {
                        "average_audio_activity": round(avg_audio, 1),
                        "modality": "audio"
                    },
                    "suggested_action": "If interactive discussion was planned for this segment, prompt a designated study group or call for volunteer questions.",
                    "confidence": 0.84,
                    "supporting_metric": "audio_activity"
                })

        return recommendations
