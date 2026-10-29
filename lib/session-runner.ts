import { getDb } from "./db";
import { calculateExplainableEngagement } from "./analytics";
import { evaluateSessionMetrics } from "./recommendations";

export interface LiveSessionState {
  sessionId: string;
  inputMode: string;
  config: Record<string, any>;
  status: string;
  startTime: Date;
  elapsedSeconds: number;
  isPaused: boolean;
  isStopped: boolean;
  observedTracks: Record<string, any>;
  currentMetrics: {
    participation_activity: number;
    movement_patterns: number;
    head_orientation: number;
    audio_activity: number;
  };
  recentEvents: Array<{
    timestamp: string;
    message: string;
    type: string;
  }>;
}

class SessionRunnerManager {
  private activeSessions: Map<string, LiveSessionState> = new Map();
  private tickerInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startTicker();
  }

  private startTicker() {
    if (this.tickerInterval) return;
    this.tickerInterval = setInterval(() => {
      const now = new Date();
      this.activeSessions.forEach((state) => {
        if (state.isStopped || state.isPaused) return;

        state.elapsedSeconds += 1;

        if (state.inputMode === "Simulated classroom session") {
          this.tickSimulated(state, now);
        }
      });
    }, 1000);
  }

  private tickSimulated(state: LiveSessionState, now: Date) {
    // Natural subtle fluctuations
    const pDelta = (Math.random() - 0.48) * 3.0;
    const mDelta = (Math.random() - 0.50) * 4.0;
    const hDelta = (Math.random() - 0.49) * 2.5;
    const aDelta = (Math.random() - 0.50) * 5.0;

    state.currentMetrics.participation_activity = Math.round(Math.max(30, Math.min(95, state.currentMetrics.participation_activity + pDelta)) * 10) / 10;
    state.currentMetrics.movement_patterns = Math.round(Math.max(25, Math.min(92, state.currentMetrics.movement_patterns + mDelta)) * 10) / 10;
    state.currentMetrics.head_orientation = Math.round(Math.max(35, Math.min(94, state.currentMetrics.head_orientation + hDelta)) * 10) / 10;
    state.currentMetrics.audio_activity = Math.round(Math.max(15, Math.min(90, state.currentMetrics.audio_activity + aDelta)) * 10) / 10;

    for (const [tid, tinfo] of Object.entries(state.observedTracks)) {
      if (tinfo.status !== "Absent") {
        tinfo.observed_duration += 1;
        tinfo.last_seen = now.toISOString();

        if (tinfo.observed_duration >= 30 && tinfo.status === "Unverified") {
          tinfo.status = "Present";
          state.recentEvents.unshift({
            timestamp: now.toTimeString().split(" ")[0],
            message: `${tinfo.student_name || tid} marked Present (>= 30s sustained presence threshold reached)`,
            type: "attendance"
          });
          if (state.recentEvents.length > 20) state.recentEvents.pop();
        }
      }
    }
  }

  public startSession(
    sessionId: string,
    inputMode?: string,
    config?: Record<string, any>
  ): LiveSessionState {
    const db = getDb();
    const sessionRow: any = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);

    let resolvedConfig = config;
    if (!resolvedConfig && sessionRow?.configuration_json) {
      try {
        resolvedConfig = JSON.parse(sessionRow.configuration_json);
      } catch {
        resolvedConfig = {};
      }
    }
    const resolvedMode = inputMode || sessionRow?.input_mode || "Simulated classroom session";

    db.prepare("UPDATE sessions SET status = 'Running', start_time = datetime('now') WHERE id = ?").run(sessionId);

    const state: LiveSessionState = {
      sessionId,
      inputMode: resolvedMode,
      config: resolvedConfig || {},
      status: "Running",
      startTime: new Date(),
      elapsedSeconds: 0,
      isPaused: false,
      isStopped: false,
      observedTracks: {},
      currentMetrics: {
        participation_activity: 74.0,
        movement_patterns: 66.0,
        head_orientation: 70.0,
        audio_activity: 52.0
      },
      recentEvents: []
    };

    if (sessionRow) {
      const enrollments: any[] = db.prepare(`
        SELECT s.id, s.student_code, s.display_name 
        FROM students s 
        JOIN enrollments e ON e.student_id = s.id 
        WHERE e.course_id = ?
      `).all(sessionRow.course_id);

      enrollments.forEach((stu, idx) => {
        const trackId = `sim-track-${String(idx + 1).padStart(2, "0")}`;
        state.observedTracks[trackId] = {
          track_id: trackId,
          student_id: stu.id,
          student_name: stu.display_name,
          student_code: stu.student_code,
          status: "Unverified",
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          observed_duration: 0.0,
          confidence: 0.95
        };
      });
    }

    this.activeSessions.set(sessionId, state);
    return state;
  }

  public pauseSession(sessionId: string) {
    const state = this.activeSessions.get(sessionId);
    if (state) {
      state.isPaused = true;
      state.status = "Paused";
      const db = getDb();
      db.prepare("UPDATE sessions SET status = 'Paused' WHERE id = ?").run(sessionId);
    }
  }

  public resumeSession(sessionId: string) {
    const state = this.activeSessions.get(sessionId);
    if (state) {
      state.isPaused = false;
      state.status = "Running";
      const db = getDb();
      db.prepare("UPDATE sessions SET status = 'Running' WHERE id = ?").run(sessionId);
    }
  }

  public stopSession(sessionId: string) {
    const state = this.activeSessions.get(sessionId);
    if (state) {
      state.isStopped = true;
      state.status = "Completed";

      const db = getDb();
      const now = new Date();
      db.prepare("UPDATE sessions SET status = 'Completed', end_time = ? WHERE id = ?").run(now.toISOString(), sessionId);

      // Save tracks to attendance records
      for (const [tid, tinfo] of Object.entries(state.observedTracks)) {
        const existing: any = db.prepare(
          "SELECT id FROM attendance_records WHERE session_id = ? AND student_id = ?"
        ).get(sessionId, tinfo.student_id);

        if (!existing) {
          db.prepare(`
            INSERT INTO attendance_records (id, session_id, student_id, anonymous_track_id, first_seen, last_seen, observed_duration, status, source, manually_corrected, confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            `att-${sessionId}-${tid}`,
            sessionId,
            tinfo.student_id,
            tinfo.track_id,
            tinfo.first_seen,
            tinfo.last_seen,
            tinfo.observed_duration,
            tinfo.status,
            state.inputMode === "Simulated classroom session" ? "simulated" : "automated_vision",
            0,
            tinfo.confidence
          );
        } else {
          db.prepare(`
            UPDATE attendance_records SET observed_duration = ?, status = ? WHERE id = ?
          `).run(tinfo.observed_duration, tinfo.status, existing.id);
        }
      }

      // Save final metric
      const fused = calculateExplainableEngagement(state.currentMetrics);
      const score = fused.score || 70.0;
      const durationMins = Math.max(1, state.elapsedSeconds / 60);

      db.prepare(`
        INSERT INTO engagement_metrics (id, session_id, interval_start, interval_end, metric_name, metric_value, confidence, source_modality, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `metric-${sessionId}-final`,
        sessionId,
        new Date(now.getTime() - durationMins * 60000).toISOString(),
        now.toISOString(),
        "explainable_score",
        score,
        0.92,
        "multimodal_fusion",
        JSON.stringify({ elapsed_seconds: state.elapsedSeconds })
      );

      // Recommendations
      const recs = evaluateSessionMetrics([state.currentMetrics], durationMins, ["video", "audio"]);
      recs.forEach((r, idx) => {
        db.prepare(`
          INSERT INTO recommendations (id, session_id, title, explanation, evidence_json, suggested_action, confidence, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `rec-${sessionId}-${idx+1}`,
          sessionId,
          r.title,
          r.explanation,
          JSON.stringify(r.evidence_json),
          r.suggested_action,
          r.confidence,
          "active",
          now.toISOString()
        );
      });
    }
  }

  public finalizeSession(sessionId: string) {
    this.stopSession(sessionId);
    this.activeSessions.delete(sessionId);
  }

  public getSessionState(sessionId: string): LiveSessionState | undefined {
    return this.activeSessions.get(sessionId);
  }
}

// Global singleton
export const sessionRunnerManager = new SessionRunnerManager();
