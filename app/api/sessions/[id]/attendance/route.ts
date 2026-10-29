import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const records = db.prepare(`
      SELECT 
        a.id,
        a.session_id,
        a.student_id,
        s.display_name as student_name,
        s.student_code,
        a.anonymous_track_id,
        a.first_seen,
        a.last_seen,
        a.observed_duration,
        a.status,
        a.source,
        CASE WHEN a.manually_corrected = 1 THEN 1 ELSE 0 END as manually_corrected,
        a.confidence
      FROM attendance_records a
      LEFT JOIN students s ON a.student_id = s.id
      WHERE a.session_id = ?
      ORDER BY s.student_code ASC
    `).all(params.id) as any[];

    const formatted = records.map((r) => ({
      ...r,
      manually_corrected: Boolean(r.manually_corrected)
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { student_id, status, source, confidence } = body;
    const db = getDb();
    const id = `att-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO attendance_records (id, session_id, student_id, anonymous_track_id, first_seen, last_seen, observed_duration, status, source, manually_corrected, confidence)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?)
    `).run(
      id,
      params.id,
      student_id || null,
      `manual-track-${crypto.randomUUID().slice(0, 4)}`,
      now,
      now,
      status || "Present",
      source || "manual_entry",
      confidence || 1.0
    );

    return NextResponse.json({ message: "Attendance record created", id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
