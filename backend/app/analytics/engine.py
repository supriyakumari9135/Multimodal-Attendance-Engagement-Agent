from typing import Dict, List, Any, Optional
import numpy as np

DEFAULT_WEIGHTS = {
    "participation_activity": 0.35,
    "movement_patterns": 0.25,
    "head_orientation": 0.20,
    "audio_activity": 0.20
}

def calculate_explainable_engagement(
    metrics_by_modality: Dict[str, float],
    custom_weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Computes a transparent, explainable engagement score between 0 and 100.
    - Renormalizes weights strictly over available signals.
    - Never assigns zero to an unavailable modality.
    - Reports 'Insufficient data' if signals are missing or inadequate.
    - Low movement is NEVER equated to disengagement (notes that quiet listening/reading is valid).
    """
    weights = custom_weights.copy() if custom_weights else DEFAULT_WEIGHTS.copy()
    
    # Filter to only modalities that are present with non-None values
    available_modalities = {k: v for k, v in metrics_by_modality.items() if v is not None and k in weights}
    
    if not available_modalities:
        return {
            "score": None,
            "status": "Insufficient data",
            "confidence": 0.0,
            "explanation": "No active sensor or observation modalities available for calculation.",
            "available_modalities": [],
            "renormalized_weights": {},
            "contributions": {}
        }
    
    # Renormalize weights over available modalities
    total_weight = sum(weights[k] for k in available_modalities.keys())
    if total_weight <= 0:
        total_weight = 1.0

    renormalized_weights = {k: weights[k] / total_weight for k in available_modalities.keys()}
    
    contributions = {}
    fused_score = 0.0
    for k, val in available_modalities.items():
        # Clamp val to 0-100
        clamped_val = max(0.0, min(100.0, float(val)))
        contrib = clamped_val * renormalized_weights[k]
        contributions[k] = round(contrib, 2)
        fused_score += contrib

    final_score = round(fused_score, 1)

    # Determine confidence based on modality coverage
    coverage_ratio = len(available_modalities) / len(weights)
    confidence = round(min(0.98, max(0.40, coverage_ratio * 0.95)), 2)

    return {
        "score": final_score,
        "status": "Calculated" if coverage_ratio >= 0.5 else "Partial data",
        "confidence": confidence,
        "available_modalities": list(available_modalities.keys()),
        "renormalized_weights": {k: round(v, 3) for k, v in renormalized_weights.items()},
        "contributions": contributions,
        "limitation_note": (
            "Behavioral indicators are proxies, not proof of comprehension, motivation, or learning. "
            "Low physical movement may reflect attentive note-taking or deep listening."
        )
    }

def detect_significant_shifts(timeline_records: List[Dict[str, Any]], threshold: float = 15.0) -> List[Dict[str, Any]]:
    """
    Identifies intervals where activity indicators changed substantially.
    Uses strictly neutral, objective wording, e.g.:
    'Participation activity decreased during this interval.'
    NEVER: 'Students stopped paying attention.'
    """
    insights = []
    if len(timeline_records) < 2:
        return insights

    for i in range(1, len(timeline_records)):
        prev = timeline_records[i - 1]
        curr = timeline_records[i]
        
        prev_p = prev.get("participation_activity")
        curr_p = curr.get("participation_activity")
        
        if prev_p is not None and curr_p is not None:
            diff = curr_p - prev_p
            if abs(diff) >= threshold:
                direction = "increased" if diff > 0 else "decreased"
                t_from = prev.get("interval_label", f"Interval {i}")
                t_to = curr.get("interval_label", f"Interval {i+1}")
                insights.append({
                    "interval": f"{t_from} to {t_to}",
                    "metric": "participation_activity",
                    "change": round(diff, 1),
                    "wording": f"Participation activity {direction} by {abs(round(diff, 1))}% during this interval.",
                    "evidence": {
                        "prior_value": prev_p,
                        "current_value": curr_p,
                        "sensor_modality": "video"
                    },
                    "confidence": 0.88,
                    "limitation": "External factors, classroom task shifts, or quiet writing phases may account for variations."
                })
                
    return insights

