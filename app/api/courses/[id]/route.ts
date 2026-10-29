import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const id = params.id;
    db.prepare("DELETE FROM courses WHERE id = ?").run(id);
    return NextResponse.json({ message: "Course deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

