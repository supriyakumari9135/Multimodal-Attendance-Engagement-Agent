import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  try {
    const db = getDb();
    const courses = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
        (SELECT COUNT(*) FROM sessions WHERE course_id = c.id) as sessions_count
      FROM courses c
      ORDER BY c.created_at DESC
    `).all();

    return NextResponse.json(courses);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { course_code, name } = body;
    if (!course_code || !name) {
      return NextResponse.json({ detail: "course_code and name are required" }, { status: 400 });
    }

    const db = getDb();
    // Default teacher if not provided
    const teacherId = body.teacher_id || "user-demo-teacher-01";
    const id = `course-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO courses (id, course_code, name, teacher_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, course_code, name, teacherId, now);

    const created = db.prepare(`
      SELECT 
        c.*,
        0 as enrolled_count,
        0 as sessions_count
      FROM courses c WHERE c.id = ?
    `).get(id);

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

