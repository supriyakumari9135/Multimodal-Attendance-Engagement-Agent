# System Architecture: Multimodal Attendance & Engagement Agent

## 1. High-Level Architectural Diagram

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Next.js 14 / TypeScript)"]
        UI["Modern Light-First Dashboard UI"]
        WebCam["Browser getUserMedia Camera Feed"]
        WebAudio["Web Audio API Energy Monitor"]
        Recharts["Explainable Analytics (Recharts)"]
        Overlay["Detection & Track Canvas Overlay"]
    end

    subgraph Backend["Backend Service (FastAPI / Python 3.12)"]
        API["FastAPI REST Endpoints (/api)"]
        Worker["Background Session Runner & Ticker"]
        
        subgraph VisionEngine["Computer Vision Pipeline"]
            Decoder["OpenCV Video Frame Sampler"]
            HOG["HOG & Cascade Person Detector"]
            Tracker["Temporal Centroid Tracker"]
            Motion["Frame Differencing Motion Intensity"]
        end

        subgraph AudioEngine["Audio Activity Processor"]
            RMS["PCM Energy Analyzer"]
            VAD["Voice Activity Ratio Detector"]
        end

        subgraph ReasoningEngine["Analytics & Pedagogical Engine"]
            Fusion["Explainable Score Fusion (Renormalized Weights)"]
            Shifts["Neutral Interval Shift Detector"]
            Rules["Local Rule-Based Teaching Assistant"]
        end

        subgraph DocumentGen["Document Generators"]
            CSVGen["CSV Attendance Register"]
            PDFGen["ReportLab PDF Generator"]
        end
    end

    subgraph Storage["Local Storage (Zero Cloud Dependency)"]
        SQLite[(SQLite Local Database: data/attendance.db)]
        Uploads[Local Media Filesystem: data/uploads/]
        Reports[Local Reports Filesystem: data/reports/]
    end

    UI -->|REST API / JSON| API
    WebCam -->|Frame ingestion / getUserMedia| Overlay
    WebAudio -->|PCM Buffers| AudioEngine
    API --> Worker
    Worker --> VisionEngine
    Worker --> AudioEngine
    VisionEngine --> ReasoningEngine
    AudioEngine --> ReasoningEngine
    ReasoningEngine --> Storage
    API --> DocumentGen
    DocumentGen --> Reports
```

## 2. Multimodal Data Pipeline

### Video Processing Pipeline
1. **Frame Sampling:** Frames are decoded locally from webcam streams or uploaded video files at a configurable interval (0.5 to 2.0 FPS).
2. **Person & Face Detection:** Utilizes OpenCV's Default People HOG Descriptor combined with Haar cascade fallbacks to detect visible persons without requiring heavy GPU or cloud neural network dependencies.
3. **Anonymous Centroid Tracking:** Detections are assigned persistent anonymous track IDs (`track-01`, `track-02`, etc.) across consecutive frames using Euclidean distance centroid matching.
4. **Sustained Presence Verification:** A participant is marked as `Present` only after their observed duration meets a configurable threshold (e.g. $\ge 30$ seconds). Brief occlusions (up to 15 frames) are bridged before retiring a track.
5. **Physical Movement Intensity:** Optical frame differencing with Gaussian smoothing calculates overall classroom movement intensity ($0-100\%$).

### Audio Processing Pipeline
1. **Vocal Activity Ratio:** Analyzes raw 16-bit mono PCM chunks to compute root-mean-square (RMS) energy.
2. **Missing Modality Handling:** When audio input is unavailable or disabled, the system explicitly reports the modality as inactive and renormalizes visual metrics without assigning a penalizing zero.

### Explainable Fusion & Pedagogical Assistant
1. **Weight Renormalization:** Configurable initial weights (Participation: 35%, Movement: 25%, Head Orientation: 20%, Audio: 20%) are normalized strictly over active signals.
2. **Neutral Insight Language:** Time window shifts are phrased objectively (e.g., *"Participation activity decreased during this interval"*)—never subjective or judgmental assertions like *"Students stopped paying attention"*.
3. **Deterministic Rules-Based Teaching Assistant:** Recommends peer discussions, pacing pauses, or concept check-ins based purely on statistical dynamics without requiring external LLM APIs.

