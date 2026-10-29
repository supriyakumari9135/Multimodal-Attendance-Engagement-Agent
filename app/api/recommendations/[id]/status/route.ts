import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status } = body;
    if (!status) {
      return NextResponse.json({ detail: "status is required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("UPDATE recommendations SET status = ? WHERE id = ?").run(status, params.id);

    return NextResponse.json({ message: "Recommendation status updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

