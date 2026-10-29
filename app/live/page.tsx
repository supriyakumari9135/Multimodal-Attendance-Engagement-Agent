"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Play,
  Pause,
  Square,
  CheckCircle,
  AlertTriangle,
  Upload,
  Cpu,
  ShieldCheck,
  Users,
  Clock,
  Settings,
  RefreshCw,
  Camera,
  Activity,
  Layers
} from "lucide-react";
import { api, Course, SessionItem } from "@/lib/api";
import { formatTime } from "@/lib/utils";

export default function LiveSessionPage() {
  // Setup workflow state
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [plannedDuration, setPlannedDuration] = useState<number>(45);
  const [inputMode, setInputMode] = useState<string>("Simulated classroom session");
  const [enableVideo, setEnableVideo] = useState<boolean>(true);
  const [enableAudio, setEnableAudio] = useState<boolean>(true);
  const [consentEnforced, setConsentEnforced] = useState<boolean>(true);
  const [privacyAgreed, setPrivacyAgreed] = useState<boolean>(true);

  // Active session state
  const [activeSession, setActiveSession] = useState<SessionItem | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("Draft");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [liveMetrics, setLiveMetrics] = useState<any>({
    participation_activity: 75.0,
    movement_patterns: 68.0,
    head_orientation: 72.0,
    audio_activity: 55.0,
    explainable_score: 72.0
  });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  // Video capture & overlay state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [showOverlay, setShowOverlay] = useState<boolean>(true);

  // Video Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<any>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);

  // Load courses on mount
  useEffect(() => {
    async function load() {
      try {
        const c = await api.getCourses();
        setCourses(c);
        if (c.length > 0) {
          setSelectedCourseId(c[0].id);
          setTitle(`${c[0].course_code} - Interactive Lecture`);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  // Enumerate video devices
  useEffect(() => {
    if (navigator?.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevs = devices.filter((d) => d.kind === "videoinput");
        setCameraDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      }).catch(() => {});
    }
  }, []);

  // Poll processing status when session is active
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(async () => {
      try {
        const st = await api.getProcessingStatus(activeSession.id);
        if (st && st.status) {
          setSessionStatus(st.status);
          if (st.elapsed_seconds !== undefined) setElapsedSeconds(st.elapsed_seconds);
          if (st.active_tracks_count !== undefined) setParticipantCount(st.active_tracks_count);
          if (st.current_metrics) setLiveMetrics(st.current_metrics);
          if (st.recent_events) setRecentEvents(st.recent_events);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Start webcam preview when live camera mode is chosen
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
        audio: enableAudio
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError(
        "Camera permission was denied or no camera device found. You can seamlessly use 'Simulated classroom session' or 'Uploaded video' mode."
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Create & Start Session
  const handleCreateAndStart = async () => {
    if (!selectedCourseId) {
      alert("Please select a course");
      return;
    }
    try {
      const sess = await api.createSession({
        course_id: selectedCourseId,
        title: title || "Classroom Session",
        input_mode: inputMode,
        planned_duration_minutes: plannedDuration,
        configuration_json: {
          enable_video: enableVideo,
          enable_audio: enableAudio,
          consent_enforced: consentEnforced
        }
      });
      setActiveSession(sess);

      if (inputMode === "Live camera") {
        await startCamera();
      }

      await api.startSession(sess.id);
      setSessionStatus("Running");
    } catch (err: any) {
      alert("Error starting session: " + err.message);
    }
  };

  // Controls: Pause, Resume, Stop, Finalize
  const handlePause = async () => {
    if (!activeSession) return;
    await api.pauseSession(activeSession.id);
    setSessionStatus("Paused");
  };

  const handleResume = async () => {
    if (!activeSession) return;
    await api.resumeSession(activeSession.id);
    setSessionStatus("Running");
  };

  const handleStop = async () => {
    if (!activeSession) return;
    await api.stopSession(activeSession.id);
    stopCamera();
    setSessionStatus("Completed");
  };

  const handleFinalize = async () => {
    if (!activeSession) return;
    await api.finalizeSession(activeSession.id);
    stopCamera();
    setActiveSession(null);
    setSessionStatus("Draft");
    setElapsedSeconds(0);
    alert("Session finalized and saved to permanent records.");
  };

  // Upload video handler
  const handleUploadVideo = async () => {
    if (!activeSession || !uploadFile) {
      alert("Please select a video file to upload");
      return;
    }
    try {
      setUploadLoading(true);
      await api.uploadSessionVideo(activeSession.id, uploadFile);
      // Poll upload progress
      const poll = setInterval(async () => {
        const pr = await api.getProcessingStatus(activeSession.id);
        setUploadProgress(pr);
        if (pr.status === "completed" || pr.status === "failed") {
          clearInterval(poll);
          setUploadLoading(false);
          if (pr.status === "completed") {
            setSessionStatus("Completed");
          }
        }
      }, 1500);
    } catch (err: any) {
      setUploadLoading(false);
      alert("Upload failed: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-darkSlate-900">
            Live Session Management
          </h2>
          <p className="text-sm text-darkSlate-500">
            Multi-modal observation interface with local tracking, privacy controls, and explainable metrics.
          </p>
        </div>

        {activeSession && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-darkSlate-500 font-medium">Session State:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                sessionStatus === "Running"
                  ? "bg-emerald-100 text-emerald-800 animate-pulse"
                  : sessionStatus === "Paused"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {sessionStatus}
            </span>
          </div>
        )}
      </div>

      {!activeSession ? (
        /* ================= SETUP WORKFLOW (STEPS 1 TO 6) ================= */
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6 max-w-3xl mx-auto space-y-6">
          <div className="border-b border-border pb-3">
            <h3 className="text-lg font-semibold text-darkSlate-900">
              Configure New Classroom Session
            </h3>
            <p className="text-xs text-darkSlate-500">
              Set classroom parameters, sensor modalities, and verify local privacy guarantees.
            </p>
          </div>

          <div className="space-y-4">
            {/* Step 1: Select Course */}
            <div>
              <label className="block text-xs font-semibold text-darkSlate-700 uppercase tracking-wider mb-1.5">
                Step 1: Select Classroom Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  const found = courses.find((c) => c.id === e.target.value);
                  if (found) setTitle(`${found.course_code} - Interactive Lecture`);
                }}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-darkSlate-900 focus:ring-1 focus:ring-emerald-500"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Title & Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-darkSlate-700 uppercase tracking-wider mb-1.5">
                  Step 2: Session Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab 4: Binary Trees"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-darkSlate-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-darkSlate-700 uppercase tracking-wider mb-1.5">
                  Planned Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={plannedDuration}
                  onChange={(e) => setPlannedDuration(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-darkSlate-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Step 3: Input Mode */}
            <div>
              <label className="block text-xs font-semibold text-darkSlate-700 uppercase tracking-wider mb-1.5">
                Step 3: Choose Input Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "Simulated classroom session",
                    label: "Simulated Classroom",
                    desc: "Deterministic synthetic live stream with 14 students"
                  },
                  {
                    id: "Live camera",
                    label: "Live Camera Stream",
                    desc: "Local browser camera capture (getUserMedia)"
                  },
                  {
                    id: "Uploaded video",
                    label: "Uploaded Video",
                    desc: "Offline video file decoding via OpenCV"
                  }
                ].map((mode) => (
                  <div
                    key={mode.id}
                    onClick={() => setInputMode(mode.id)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      inputMode === mode.id
                        ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                        : "border-border bg-background hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-darkSlate-900">
                        {mode.label}
                      </span>
                      {inputMode === mode.id && (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-darkSlate-500 leading-snug">
                      {mode.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 4: Enabled Processing Capabilities */}
            <div>
              <label className="block text-xs font-semibold text-darkSlate-700 uppercase tracking-wider mb-1.5">
                Step 4: Active Sensor Capabilities
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center space-x-2.5 p-3 rounded-lg border border-border bg-background cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableVideo}
                    onChange={(e) => setEnableVideo(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <div>
                    <span className="font-semibold text-darkSlate-900 block">
                      Video Presence & Movement
                    </span>
                    <span className="text-[11px] text-darkSlate-500">
                      HOG person detector & frame differencing
                    </span>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 p-3 rounded-lg border border-border bg-background cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableAudio}
                    onChange={(e) => setEnableAudio(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <div>
                    <span className="font-semibold text-darkSlate-900 block">
                      Vocal Activity Ratio
                    </span>
                    <span className="text-[11px] text-darkSlate-500">
                      RMS energy & speech segmentation
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Step 5: Privacy Checklist */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-slate-800 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Step 5: Privacy & Ethical Guardrail Checklist</span>
              </div>
              <ul className="space-y-1.5 text-darkSlate-600 text-[11px]">
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Processing occurs 100% locally on this device. No media is ever sent to external cloud servers.</span>
                </li>
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Behavioral indicators are non-invasive proxies. Never used to infer emotional state or intelligence.</span>
                </li>
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Student opt-in consent is strictly respected for identity association.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Step 6: Start Session Action */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleCreateAndStart}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Start Session</span>
            </button>
          </div>
        </div>
      ) : (
        /* ================= ACTIVE LIVE SESSION VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Video / Canvas Stream & Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface rounded-xl border border-border shadow-sm p-4 space-y-3">
              {/* Top Stream Status Bar */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 text-darkSlate-900 font-semibold">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-mono">{formatTime(elapsedSeconds)}</span>
                  </div>
                  <div className="h-4 w-px bg-border"></div>
                  <div className="flex items-center space-x-1 text-darkSlate-600">
                    <Users className="w-4 h-4 text-sky-600" />
                    <span>{participantCount} Active Participants</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowOverlay(!showOverlay)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                      showOverlay
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-surface text-darkSlate-500 border-border"
                    }`}
                  >
                    Overlay {showOverlay ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Stream Screen View */}
              <div className="relative aspect-video bg-darkSlate-900 rounded-lg overflow-hidden flex items-center justify-center border border-darkSlate-800">
                {inputMode === "Live camera" ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {cameraError && (
                      <div className="absolute inset-0 bg-darkSlate-900/90 p-6 flex flex-col items-center justify-center text-center text-white space-y-3">
                        <AlertTriangle className="w-8 h-8 text-amber-400" />
                        <p className="text-sm max-w-md">{cameraError}</p>
                        <button
                          onClick={() => setInputMode("Simulated classroom session")}
                          className="px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold"
                        >
                          Switch to Simulated Session
                        </button>
                      </div>
                    )}
                  </>
                ) : inputMode === "Uploaded video" ? (
                  <div className="text-center p-6 text-white space-y-3">
                    <Upload className="w-10 h-10 text-emerald-400 mx-auto" />
                    <p className="text-sm font-medium">Classroom Video Ingestion</p>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="text-xs text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                    />
                    {uploadFile && (
                      <button
                        onClick={handleUploadVideo}
                        disabled={uploadLoading}
                        className="mt-2 px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                      >
                        {uploadLoading ? "Processing Video Frames..." : "Start Video Analysis"}
                      </button>
                    )}
                    {uploadProgress && (
                      <div className="w-64 mx-auto space-y-1 pt-2">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>{uploadProgress.message}</span>
                          <span>{uploadProgress.progress_pct}%</span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${uploadProgress.progress_pct}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Simulated Stream Visual Animation */
                  <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-white overflow-hidden">
                    {/* Simulated Classroom Grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 opacity-80 w-full max-w-lg">
                      {Array.from({ length: 14 }).map((_, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded border border-emerald-900/60 bg-emerald-950/20 text-center relative"
                        >
                          <div className="w-6 h-6 rounded-full bg-emerald-600/30 mx-auto flex items-center justify-center text-[10px] text-emerald-400 font-bold mb-1">
                            {i + 1}
                          </div>
                          <span className="text-[9px] text-emerald-300 block truncate font-mono">
                            STU-{1001 + i}
                          </span>
                          <span className="text-[8px] text-emerald-400/80 block">
                            Present
                          </span>
                          {showOverlay && (
                            <div className="absolute inset-0 border border-emerald-500/40 rounded animate-pulse"></div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="absolute bottom-3 left-4 flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>LOCAL SIMULATED STREAM &bull; 1.0 FPS SAMPLING</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Real Operational Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center space-x-2">
                  {sessionStatus === "Running" ? (
                    <button
                      onClick={handlePause}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Session</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleResume}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Session</span>
                    </button>
                  )}

                  <button
                    onClick={handleStop}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop Session</span>
                  </button>

                  <button
                    onClick={handleFinalize}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-surface hover:bg-slate-100 text-darkSlate-700 border border-border text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Finalize & Save</span>
                  </button>
                </div>

                <div className="text-xs text-darkSlate-500 font-mono">
                  Input: {inputMode}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Real-time Indicators & Event Stream */}
          <div className="space-y-4">
            {/* Real-time Indicator Gauge */}
            <div className="bg-surface rounded-xl border border-border shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-semibold text-darkSlate-900">
                Live Activity Gauges
              </h3>
              <p className="text-[11px] text-darkSlate-500">
                Transparent measurements updated deterministically every 1s.
              </p>

              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-medium text-darkSlate-700 mb-1">
                    <span>Participation Activity</span>
                    <span className="text-emerald-700 font-bold">{liveMetrics.participation_activity}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${liveMetrics.participation_activity}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-darkSlate-700 mb-1">
                    <span>Movement Patterns</span>
                    <span className="text-sky-700 font-bold">{liveMetrics.movement_patterns}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${liveMetrics.movement_patterns}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-darkSlate-700 mb-1">
                    <span>Audio Vocal Activity</span>
                    <span className="text-amber-700 font-bold">{liveMetrics.audio_activity}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${liveMetrics.audio_activity}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Event Stream */}
            <div className="bg-surface rounded-xl border border-border shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-semibold text-darkSlate-900">
                Real-Time Attendance Events
              </h3>
              <p className="text-[11px] text-darkSlate-500">
                30s sustained threshold verification stream.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                {recentEvents.length === 0 ? (
                  <p className="text-[11px] text-darkSlate-400 italic py-2">
                    Monitoring participant tracks...
                  </p>
                ) : (
                  recentEvents.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-background rounded border border-border flex items-start space-x-2 text-[11px]"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-darkSlate-800 font-medium block">
                          {ev.message}
                        </span>
                        <span className="text-[10px] text-darkSlate-400">
                          {ev.timestamp}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

