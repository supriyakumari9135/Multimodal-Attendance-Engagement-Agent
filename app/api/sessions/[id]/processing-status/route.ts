import { NextResponse } from "next/server";
import { sessionRunnerManager } from "@/lib/session-runner";
import { getDb } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const runnerState = sessionRunnerManager.getSessionState(sessionId);

    if (runnerState) {
      if (!runnerState.isPaused && !runnerState.isStopped) {
        const calculatedElapsed = Math.floor((Date.now() - new Date(runnerState.startTime).getTime()) / 1000);
        if (calculatedElapsed > runnerState.elapsedSeconds) {
          runnerState.elapsedSeconds = calculatedElapsed;
        }
      }

      return NextResponse.json({
        session_id: sessionId,
        status: runnerState.status,
        elapsed_seconds: runnerState.elapsedSeconds,
        active_tracks_count: Object.keys(runnerState.observedTracks).length,
        current_metrics: runnerState.currentMetrics,
        recent_events: runnerState.recentEvents,
        observed_tracks: Object.values(runnerState.observedTracks)
      });
    }

    // Fallback to database
    const db = getDb();
    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as any;
    if (!session) {
      return NextResponse.json({ detail: "Session not found" }, { status: 404 });
    }

    const tracks = db.prepare(`
      SELECT 
        a.anonymous_track_id as track_id,
        a.student_id,
        s.display_name as student_name,
        s.student_code,
        a.status,
        a.first_seen,
        a.last_seen,
        a.observed_duration,
        a.confidence
      FROM attendance_records a
      LEFT JOIN students s ON a.student_id = s.id
      WHERE a.session_id = ?
    `).all(sessionId);

    return NextResponse.json({
      session_id: sessionId,
      status: session.status,
      elapsed_seconds: 0,
      active_tracks_count: tracks.length,
      current_metrics: {
        participation_activity: 70.0,
        movement_patterns: 65.0,
        head_orientation: 72.0,
        audio_activity: 50.0
      },
      recent_events: [
        {
          timestamp: new Date().toISOString(),
          message: `Session record loaded from database (${session.status})`,
          type: "status"
        }
      ],
      observed_tracks: tracks
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

