import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("course_id");
    const sessionId = searchParams.get("session_id");

    const db = getDb();

    // Total enrolled students
    let stuCountQuery = "SELECT COUNT(*) as count FROM students";
    const stuCount = (db.prepare(stuCountQuery).get() as any)?.count || 0;

    // Active courses count
    const coursesCount = (db.prepare("SELECT COUNT(*) as count FROM courses").get() as any)?.count || 0;

    // Total sessions count
    let sessCountQuery = "SELECT COUNT(*) as count FROM sessions";
    let sessParams: any[] = [];
    if (courseId) {
      sessCountQuery += " WHERE course_id = ?";
      sessParams.push(courseId);
    }
    const sessCount = (db.prepare(sessCountQuery).get(...sessParams) as any)?.count || 0;

    // Target session for details: specified sessionId or latest session
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      let targetQuery = "SELECT id FROM sessions";
      let targetParams: any[] = [];
      if (courseId) {
        targetQuery += " WHERE course_id = ?";
        targetParams.push(courseId);
      }
      targetQuery += " ORDER BY start_time DESC LIMIT 1";
      const latest = db.prepare(targetQuery).get(...targetParams) as any;
      targetSessionId = latest?.id;
    }

    let presentCount = 0;
    let attendancePct = 0;
    let durationMinutes = 45;
    let avgEngagement = 74.0;
    let participation = 68.0;

    if (targetSessionId) {
      const attSummary = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('Present', 'Verified Present') THEN 1 ELSE 0 END) as present_cnt
        FROM attendance_records
        WHERE session_id = ?
      `).get(targetSessionId) as any;

      if (attSummary && attSummary.total > 0) {
        presentCount = attSummary.present_cnt || 0;
        attendancePct = Math.round((presentCount / attSummary.total) * 100);
      }

      const eng = db.prepare(`
        SELECT AVG(metric_value) as avg_eng
        FROM engagement_metrics
        WHERE session_id = ? AND metric_name = 'explainable_score'
      `).get(targetSessionId) as any;
      if (eng && eng.avg_eng) {
        avgEngagement = Math.round(eng.avg_eng * 10) / 10;
      }

      // Check session duration
      const sess = db.prepare("SELECT * FROM sessions WHERE id = ?").get(targetSessionId) as any;
      if (sess && sess.start_time && sess.end_time) {
        const ms = new Date(sess.end_time).getTime() - new Date(sess.start_time).getTime();
        durationMinutes = Math.max(1, Math.round(ms / 60000));
      } else if (sess && sess.start_time) {
        const ms = Date.now() - new Date(sess.start_time).getTime();
        durationMinutes = Math.max(1, Math.round(ms / 60000));
      }
    }

    // Recommendation count
    const recCount = (db.prepare("SELECT COUNT(*) as count FROM recommendations WHERE status = 'active'").get() as any)?.count || 0;

    return NextResponse.json({
      total_enrolled_students: stuCount,
      active_courses_count: coursesCount,
      total_sessions_count: sessCount,
      selected_session_present: presentCount,
      selected_session_attendance_pct: attendancePct,
      current_session_duration_minutes: durationMinutes,
      average_engagement_score: avgEngagement,
      recent_participation_activity: participation,
      teaching_recommendation_count: recCount,
      is_demo_mode: true
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

