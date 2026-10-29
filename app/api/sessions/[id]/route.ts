import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const session = db.prepare(`
      SELECT s.*, c.name as course_name, c.course_code
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `).get(params.id) as any;

    if (!session) {
      return NextResponse.json({ detail: "Session not found" }, { status: 404 });
    }

    let config = {};
    try {
      config = JSON.parse(session.configuration_json || "{}");
    } catch {
      config = {};
    }

    return NextResponse.json({
      ...session,
      configuration_json: config
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
    db.prepare("DELETE FROM sessions WHERE id = ?").run(params.id);
    return NextResponse.json({ message: "Session deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

