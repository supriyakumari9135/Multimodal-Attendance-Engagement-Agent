import { NextResponse } from "next/server";
import { sessionRunnerManager } from "@/lib/session-runner";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    sessionRunnerManager.pauseSession(params.id);
    return NextResponse.json({ status: "Paused" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
