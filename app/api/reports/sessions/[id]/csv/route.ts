import { NextResponse } from "next/server";
import { generateSessionCsv } from "@/lib/reports";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const csvContent = generateSessionCsv(params.id);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-session-${params.id}.csv"`
      }
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

