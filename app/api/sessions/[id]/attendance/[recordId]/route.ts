import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; recordId: string } }
) {
  try {
    const body = await req.json();
    const { status, student_id, notes } = body;
    const db = getDb();

    const record = db.prepare("SELECT * FROM attendance_records WHERE id = ?").get(params.recordId) as any;
    if (!record) {
      return NextResponse.json({ detail: "Attendance record not found" }, { status: 404 });
    }

    const newStatus = status || record.status;
    const newStudentId = student_id !== undefined ? student_id : record.student_id;

    db.prepare(`
      UPDATE attendance_records
      SET status = ?, student_id = ?, manually_corrected = 1
      WHERE id = ?
    `).run(newStatus, newStudentId, params.recordId);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, timestamp, details_json)
      VALUES (?, 'user-demo-teacher-01', 'MANUAL_ATTENDANCE_CORRECTION', 'ATTENDANCE_RECORD', ?, ?, ?)
    `).run(
      `audit-${Date.now()}`,
      params.recordId,
      new Date().toISOString(),
      JSON.stringify({
        previous_status: record.status,
        new_status: newStatus,
        notes: notes || "Manual instructor override"
      })
    );

    return NextResponse.json({ message: "Attendance record updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

