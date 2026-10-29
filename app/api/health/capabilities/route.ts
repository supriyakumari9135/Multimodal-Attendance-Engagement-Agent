import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      name: "Video Processing Engine",
      available: true,
      status_detail: "Local browser-accelerated video & optical flow tracking (zero external transmission)",
      is_offline_ready: true
    },
    {
      name: "Voice Activity Proxy",
      available: true,
      status_detail: "Web Audio API acoustic power and conversational turn-taking proxy",
      is_offline_ready: true
    },
    {
      name: "Movement & Posture Indicator",
      available: true,
      status_detail: "Deterministic multi-point stability & physical interaction metrics",
      is_offline_ready: true
    },
    {
      name: "Local Embedded Database",
      available: true,
      status_detail: "Offline SQLite database (data/attendance.db) operational",
      is_offline_ready: true
    },
    {
      name: "Explainable Engagement Engine",
      available: true,
      status_detail: "Transparent weighted formula: (0.4 * Mov) + (0.35 * Post) + (0.25 * Speech)",
      is_offline_ready: true
    },
    {
      name: "Deterministic Teaching Assistant",
      available: true,
      status_detail: "Local rule-based intervention suggestions active (No cloud LLM required)",
      is_offline_ready: true
    }
  ]);
}

