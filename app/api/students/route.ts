import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const courseId = searchParams.get("course_id");

    const db = getDb();
    let query = `SELECT DISTINCT s.* FROM students s`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (courseId) {
      query += ` JOIN enrollments e ON s.id = e.student_id`;
      conditions.push(`e.course_id = ?`);
      params.push(courseId);
    }

    if (search) {
      conditions.push(`(s.student_code LIKE ? OR s.display_name LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY s.student_code ASC`;

    const students = db.prepare(query).all(...params) as any[];

    // Fetch courses and consents for each student
    const result = students.map((s) => {
      const enrollments = db.prepare(`
        SELECT c.name FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ?
      `).all(s.id) as any[];

      const consentsList = db.prepare(`
        SELECT consent_type, granted FROM consents WHERE student_id = ?
      `).all(s.id) as any[];

      const consents: Record<string, boolean> = {
        video_analysis: true,
        audio_proxy: true,
        pose_tracking: true
      };
      for (const c of consentsList) {
        consents[c.consent_type] = c.granted === 1;
      }

      return {
        ...s,
        courses: enrollments.map((e) => e.name),
        consents
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
    const { student_code, display_name, course_ids } = body;
    if (!student_code || !display_name) {
      return NextResponse.json({ detail: "student_code and display_name are required" }, { status: 400 });
    }

    const db = getDb();
    const id = `stu-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO students (id, student_code, display_name, reference_image_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, student_code, display_name, null, now, now);

    if (Array.isArray(course_ids)) {
      for (const cid of course_ids) {
        db.prepare(`
          INSERT INTO enrollments (id, student_id, course_id, status)
          VALUES (?, ?, ?, 'active')
        `).run(`enr-${crypto.randomUUID().slice(0, 8)}`, id, cid);
      }
    }

    // Default consents
    for (const consentType of ["video_analysis", "audio_proxy", "pose_tracking"]) {
      db.prepare(`
        INSERT INTO consents (id, student_id, consent_type, granted, updated_at)
        VALUES (?, ?, ?, 1, ?)
      `).run(`cst-${crypto.randomUUID().slice(0, 8)}`, id, consentType, now);
    }

    return NextResponse.json({
      id,
      student_code,
      display_name,
      reference_image_path: null,
      created_at: now,
      updated_at: now,
      courses: [],
      consents: { video_analysis: true, audio_proxy: true, pose_tracking: true }
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
