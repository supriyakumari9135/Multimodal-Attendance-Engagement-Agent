import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const courseId = formData.get("course_id") as string | null;

    if (!file) {
      return NextResponse.json({ detail: "No CSV file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return NextResponse.json({ detail: "Empty CSV file" }, { status: 400 });
    }

    const db = getDb();
    let importedCount = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts.length < 2) continue;

      const [code, name] = parts;
      if (code.toLowerCase() === "student_code" || code.toLowerCase() === "code" || code.toLowerCase() === "id") {
        continue; // skip header
      }

      // Check if student exists
      let existing = db.prepare("SELECT id FROM students WHERE student_code = ?").get(code) as any;
      let studentId = existing?.id;

      if (!studentId) {
        studentId = `stu-${crypto.randomUUID().slice(0, 8)}`;
        db.prepare(`
          INSERT INTO students (id, student_code, display_name, reference_image_path, created_at, updated_at)
          VALUES (?, ?, ?, null, ?, ?)
        `).run(studentId, code, name, now, now);

        for (const consentType of ["video_analysis", "audio_proxy", "pose_tracking"]) {
          db.prepare(`
            INSERT INTO consents (id, student_id, consent_type, granted, updated_at)
            VALUES (?, ?, ?, 1, ?)
          `).run(`cst-${crypto.randomUUID().slice(0, 8)}`, studentId, consentType, now);
        }
      }

      // Enroll in course if specified
      if (courseId) {
        const checkEnroll = db.prepare(`
          SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?
        `).get(studentId, courseId);
        if (!checkEnroll) {
          db.prepare(`
            INSERT INTO enrollments (id, student_id, course_id, status)
            VALUES (?, ?, ?, 'active')
          `).run(`enr-${crypto.randomUUID().slice(0, 8)}`, studentId, courseId);
        }
      }

      importedCount++;
    }

    return NextResponse.json({
      status: "success",
      imported_count: importedCount,
      message: `Successfully processed ${importedCount} student records.`
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

