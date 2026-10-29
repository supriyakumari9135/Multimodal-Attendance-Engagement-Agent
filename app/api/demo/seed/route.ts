import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/db";

export async function POST() {
  try {
    const res = seedDemoData(false);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

