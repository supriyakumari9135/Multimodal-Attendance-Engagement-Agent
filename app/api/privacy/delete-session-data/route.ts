import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ detail: "session_id query parameter is required" }, { status: 400 });
    }

    const db = getDb();
    // Delete engagement metrics and raw tracks for the session
    db.prepare("DELETE FROM engagement_metrics WHERE session_id = ?").run(sessionId);
    db.prepare("DELETE FROM recommendations WHERE session_id = ?").run(sessionId);
    // Anonymize attendance records
    db.prepare(`
      UPDATE attendance_records
      SET student_id = NULL,
          first_seen = NULL,
          last_seen = NULL
      WHERE session_id = ?
    `).run(sessionId);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, timestamp, details_json)
      VALUES (?, 'user-demo-teacher-01', 'PURGE_SESSION_BIOMETRIC_DATA', 'SESSION', ?, ?, ?)
    `).run(
      `audit-${Date.now()}`,
      sessionId,
      new Date().toISOString(),
      JSON.stringify({ purged: "raw timeline metrics, student links anonymized" })
    );

    return NextResponse.json({
      status: "success",
      message: `Privacy purge completed for session ${sessionId}. Raw observation data destroyed and records anonymized.`
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
