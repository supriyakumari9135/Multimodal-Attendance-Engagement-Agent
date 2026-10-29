import { NextResponse } from "next/server";
import { generateSessionPdfBuffer } from "@/lib/reports";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const buffer = await generateSessionPdfBuffer(params.id);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="attendance-session-${params.id}.pdf"`
      }
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
