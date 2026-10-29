import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(params.id) as any;
    if (!student) {
      return NextResponse.json({ detail: "Student not found" }, { status: 404 });
    }

    const records = db.prepare(`
      SELECT 
        a.*,
        s.title as session_title,
        s.start_time as session_start_time,
        c.course_code,
        c.name as course_name
      FROM attendance_records a
      JOIN sessions s ON a.session_id = s.id
      JOIN courses c ON s.course_id = c.id
      WHERE a.student_id = ?
      ORDER BY s.start_time DESC
    `).all(params.id) as any[];

    return NextResponse.json({
      student_id: student.id,
      student_code: student.student_code,
      display_name: student.display_name,
      records
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

