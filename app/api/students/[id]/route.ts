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
      return NextResponse.json({ detail: "Student not found" }, { status: 400 });
    }

    const enrollments = db.prepare(`
      SELECT c.name FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = ?
    `).all(student.id) as any[];

    const consentsList = db.prepare(`
      SELECT consent_type, granted FROM consents WHERE student_id = ?
    `).all(student.id) as any[];

    const consents: Record<string, boolean> = {};
    for (const c of consentsList) {
      consents[c.consent_type] = c.granted === 1;
    }

    return NextResponse.json({
      ...student,
      courses: enrollments.map((e) => e.name),
      consents
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    db.prepare("DELETE FROM students WHERE id = ?").run(params.id);
    return NextResponse.json({ message: "Student deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

