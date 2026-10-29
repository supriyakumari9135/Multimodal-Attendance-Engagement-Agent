import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("course_id");
    const status = searchParams.get("status");

    const db = getDb();
    let query = `
      SELECT 
        s.*,
        c.name as course_name,
        c.course_code
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (courseId) {
      conditions.push(`s.course_id = ?`);
      params.push(courseId);
    }
    if (status) {
      conditions.push(`s.status = ?`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }
    query += ` ORDER BY s.start_time DESC`;

    const sessions = db.prepare(query).all(...params) as any[];

    const result = sessions.map((sess) => {
      // Calculate attendance rate
      const att = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('Present', 'Verified Present') THEN 1 ELSE 0 END) as present_count
        FROM attendance_records
        WHERE session_id = ?
      `).get(sess.id) as any;

      const total = att?.total || 0;
      const present = att?.present_count || 0;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      // Avg engagement score
      const metric = db.prepare(`
        SELECT AVG(metric_value) as avg_val 
        FROM engagement_metrics 
        WHERE session_id = ? AND metric_name = 'explainable_score'
      `).get(sess.id) as any;
      const engAvg = metric?.avg_val ? Math.round(metric.avg_val * 10) / 10 : 72.0;

      let config = {};
      try {
        config = JSON.parse(sess.configuration_json || "{}");
      } catch {
        config = {};
      }

      return {
        ...sess,
        configuration_json: config,
        attendance_rate: rate,
        engagement_average: engAvg,
        total_records: total
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { course_id, title, input_mode, planned_duration_minutes, configuration_json } = body;
    if (!course_id || !title) {
      return NextResponse.json({ detail: "course_id and title are required" }, { status: 400 });
    }

    const db = getDb();
    const id = `session-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const mode = input_mode || "Simulated classroom session";
    const configStr = typeof configuration_json === "string" ? configuration_json : JSON.stringify(configuration_json || {});

    db.prepare(`
      INSERT INTO sessions (id, course_id, title, start_time, end_time, status, input_mode, configuration_json)
      VALUES (?, ?, ?, ?, null, 'Draft', ?, ?)
    `).run(id, course_id, title, now, mode, configStr);

    const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(course_id) as any;

    return NextResponse.json({
      id,
      course_id,
      title,
      start_time: now,
      end_time: null,
      status: "Draft",
      input_mode: mode,
      configuration_json: typeof configuration_json === "object" ? configuration_json : {},
      course_name: course?.name,
      course_code: course?.course_code,
      attendance_rate: 0,
      engagement_average: 70,
      total_records: 0
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

