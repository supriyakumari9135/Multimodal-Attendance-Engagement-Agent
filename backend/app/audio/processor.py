from typing import Dict, Any, List, Optional
import numpy as np

class AudioActivityProcessor:
    """
    Offline local audio activity processor.
    Analyzes PCM audio buffers / WAV files for voice activity ratio,
    energy levels, and speaking intervals.
    """

    def __init__(self, energy_threshold: float = 0.015):
        self.energy_threshold = energy_threshold

    def analyze_audio_chunk(self, pcm_bytes: bytes, sample_rate: int = 16000) -> Dict[str, Any]:
        """
        Analyze raw 16-bit PCM mono audio buffer.
        """
        if not pcm_bytes:
            return {
                "available": False,
                "voice_activity_ratio": 0.0,
                "speech_detected": False,
                "average_energy_rms": 0.0
            }

        audio_data = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        if len(audio_data) == 0:
            return {
                "available": False,
                "voice_activity_ratio": 0.0,
                "speech_detected": False,
                "average_energy_rms": 0.0
            }

        # Calculate RMS energy
        rms = float(np.sqrt(np.mean(audio_data ** 2)))
        speech_detected = rms > self.energy_threshold

        # Voice activity indicator (normalized 0 - 100)
        va_ratio = min(100.0, max(0.0, (rms / 0.1) * 100.0))

        return {
            "available": True,
            "speech_detected": speech_detected,
            "average_energy_rms": round(rms, 4),
            "voice_activity_ratio": round(va_ratio, 1),
            "audio_activity": round(va_ratio, 1)
        }

    def generate_synthetic_audio_metrics(self, duration_seconds: float) -> List[Dict[str, Any]]:
        """
        Generates realistic audio activity metrics for demonstration mode.
        """
        import random
        intervals = int(duration_seconds // 300) + 1  # 5 min intervals
        metrics = []
        for i in range(intervals):
            # Alternating lecture passages and discussion pauses
            base_activity = random.uniform(30.0, 75.0) if i % 2 == 0 else random.uniform(15.0, 45.0)
            metrics.append({
                "interval_index": i,
                "audio_activity": round(base_activity, 1),
                "voice_activity_ratio": round(base_activity, 1),
                "speech_segments_count": random.randint(3, 14)
            })
        return metrics
