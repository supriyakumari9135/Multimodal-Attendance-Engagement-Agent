import { NextResponse } from "next/server";
import { sessionRunnerManager } from "@/lib/session-runner";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    sessionRunnerManager.finalizeSession(params.id);
    return NextResponse.json({ status: "Finalized" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

