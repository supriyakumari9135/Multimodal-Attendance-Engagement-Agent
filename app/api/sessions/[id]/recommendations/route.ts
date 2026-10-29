import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM recommendations
      WHERE session_id = ?
      ORDER BY created_at DESC
    `).all(params.id) as any[];

    const recs = rows.map((r) => {
      let evidence = {};
      try {
        evidence = JSON.parse(r.evidence_json || "{}");
      } catch {
        evidence = {};
      }

      return {
        id: r.id,
        session_id: r.session_id,
        title: r.title,
        explanation: r.explanation,
        evidence_json: evidence,
        suggested_action: r.suggested_action,
        confidence: r.confidence,
        status: r.status,
        created_at: r.created_at
      };
    });

    return NextResponse.json(recs);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
