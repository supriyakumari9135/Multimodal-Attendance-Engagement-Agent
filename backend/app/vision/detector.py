import cv2
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Any
from pathlib import Path

class AnonymousTrack:
    def __init__(self, track_id: str, bbox: Tuple[int, int, int, int], timestamp: datetime):
        self.track_id = track_id
        self.bbox = bbox  # x, y, w, h
        self.first_seen = timestamp
        self.last_seen = timestamp
        self.observed_duration_seconds = 0.0
        self.frames_seen = 1
        self.missing_frames = 0
        self.confidence = 0.85

    def update(self, bbox: Tuple[int, int, int, int], timestamp: datetime, dt: float):
        self.bbox = bbox
        self.last_seen = timestamp
        self.observed_duration_seconds += dt
        self.frames_seen += 1
        self.missing_frames = 0

    @property
    def center(self) -> Tuple[float, float]:
        x, y, w, h = self.bbox
        return (x + w / 2.0, y + h / 2.0)


class ClassroomVisionPipeline:
    """
    Offline-capable Computer Vision processing pipeline.
    Uses OpenCV for video decoding, HOG/Cascade person/face detection,
    and temporal centroid tracking.
    """

    def __init__(self):
        # Initialize OpenCV HOG person detector
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

        # Load cascade for face detection fallback if available in cv2 data
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)

        self.next_track_number = 1
        self.active_tracks: Dict[str, AnonymousTrack] = {}
        self.completed_tracks: List[AnonymousTrack] = []
        self.prev_gray_frame = None

    def reset(self):
        self.next_track_number = 1
        self.active_tracks.clear()
        self.completed_tracks.clear()
        self.prev_gray_frame = None

    def detect_people_in_frame(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detects visible people/faces in a single BGR frame.
        Returns list of (x, y, w, h) bounding boxes.
        """
        height, width = frame.shape[:2]
        max_dim = 640
        scale = 1.0
        if max(height, width) > max_dim:
            scale = max_dim / float(max(height, width))
            resized = cv2.resize(frame, (int(width * scale), int(height * scale)))
        else:
            resized = frame

        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        boxes = []

        # Try HOG Person Detection
        rects, weights = self.hog.detectMultiScale(
            gray,
            winStride=(8, 8),
            padding=(4, 4),
            scale=1.05
        )

        for (x, y, w, h) in rects:
            # Rescale back
            rx, ry, rw, rh = int(x / scale), int(y / scale), int(w / scale), int(h / scale)
            boxes.append((rx, ry, rw, rh))

        # If HOG finds nothing (e.g., seated close-up classroom view), try face cascade
        if not boxes and not self.face_cascade.empty():
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(30, 30)
            )
            for (fx, fy, fw, fh) in faces:
                rx, ry, rw, rh = int(fx / scale), int(fy / scale), int(fw / scale), int(fh / scale)
                # Expand head box downward to approximate upper body
                upper_h = int(rh * 2.2)
                upper_y = max(0, ry - int(rh * 0.2))
                upper_w = int(rw * 1.4)
                upper_x = max(0, rx - int(rw * 0.2))
                boxes.append((upper_x, upper_y, upper_w, upper_h))

        return boxes

    def calculate_movement_intensity(self, frame: np.ndarray) -> float:
        """
        Calculates normalized movement frequency/intensity between frames (0-100).
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        if self.prev_gray_frame is None:
            self.prev_gray_frame = gray
            return 50.0  # Baseline neutral

        frame_diff = cv2.absdiff(self.prev_gray_frame, gray)
        self.prev_gray_frame = gray

        thresh = cv2.threshold(frame_diff, 25, 255, cv2.THRESH_BINARY)[1]
        changed_pixels = np.sum(thresh > 0)
        total_pixels = thresh.shape[0] * thresh.shape[1]

        motion_ratio = (changed_pixels / float(total_pixels)) * 100.0
        # Map 0% - 15% motion ratio to a comfortable 10 - 95 index
        normalized_intensity = min(95.0, max(10.0, motion_ratio * 7.5 + 20.0))
        return round(normalized_intensity, 1)

    def update_tracks(self, detected_boxes: List[Tuple[int, int, int, int]], timestamp: datetime, dt: float):
        """
        Matches detected bounding boxes to active tracks using centroid distance.
        """
        matched_track_ids = set()
        matched_box_indices = set()

        # Build distance matrix
        if self.active_tracks and detected_boxes:
            track_items = list(self.active_tracks.items())
            for box_idx, box in enumerate(detected_boxes):
                bx, by, bw, bh = box
                bc = (bx + bw / 2.0, by + bh / 2.0)

                best_track_id = None
                best_dist = 120.0  # Pixel threshold

                for tid, track in track_items:
                    if tid in matched_track_ids:
                        continue
                    tc = track.center
                    dist = np.hypot(bc[0] - tc[0], bc[1] - tc[1])
                    if dist < best_dist:
                        best_dist = dist
                        best_track_id = tid

                if best_track_id:
                    self.active_tracks[best_track_id].update(box, timestamp, dt)
                    matched_track_ids.add(best_track_id)
                    matched_box_indices.add(box_idx)

        # Create new tracks for unmatched detections
        for box_idx, box in enumerate(detected_boxes):
            if box_idx not in matched_box_indices:
                new_id = f"track-{self.next_track_number:02d}"
                self.next_track_number += 1
                self.active_tracks[new_id] = AnonymousTrack(new_id, box, timestamp)

        # Handle unmatched tracks (occlusion or temporary exit)
        expired_ids = []
        for tid, track in self.active_tracks.items():
            if tid not in matched_track_ids:
                track.missing_frames += 1
                # If missing for > 15 consecutive samples, retire track
                if track.missing_frames > 15:
                    expired_ids.append(tid)

        for tid in expired_ids:
            retired = self.active_tracks.pop(tid)
            self.completed_tracks.append(retired)

    def process_frame(
        self,
        frame: np.ndarray,
        timestamp: datetime,
        dt: float = 1.0
    ) -> Dict[str, Any]:
        """
        Process a single frame from webcam stream or video file.
        """
        boxes = self.detect_people_in_frame(frame)
        self.update_tracks(boxes, timestamp, dt)
        movement_val = self.calculate_movement_intensity(frame)

        active_count = len(self.active_tracks)
        # Approximate participation activity from visible count and movement
        participation_val = min(95.0, max(25.0, active_count * 15.0 + movement_val * 0.3))

        return {
            "timestamp": timestamp,
            "detected_count": len(boxes),
            "active_tracks_count": active_count,
            "movement_patterns": movement_val,
            "participation_activity": round(participation_val, 1),
            "head_orientation": round(max(30.0, min(90.0, 70.0 + (movement_val - 50) * 0.2)), 1),
            "tracks": [
                {
                    "track_id": t.track_id,
                    "bbox": t.bbox,
                    "observed_duration": round(t.observed_duration_seconds, 1),
                    "first_seen": t.first_seen.isoformat(),
                    "last_seen": t.last_seen.isoformat()
                }
                for t in self.active_tracks.values()
            ]
        }
