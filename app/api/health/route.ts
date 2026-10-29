import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET() {
  try {
    const db = getDatabase();
    const courseCount = (db.prepare("SELECT COUNT(*) as count FROM courses").get() as any)?.count || 0;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.0.0-nextjs",
      offline_mode: true,
      database: "local-sqlite-connected",
      course_count: courseCount,
      capabilities: [
        {
          name: "OpenCV Video Processing",
          available: true,
          status_detail: "In-browser WebRTC / HTML5 video feed processing with local heuristic analyzer",
          is_offline_ready: true
        },
        {
          name: "Web Audio / VAD",
          available: true,
          status_detail: "Client-side Web Audio API with local speech activity proxy energy calculation",
          is_offline_ready: true
        },
        {
          name: "Pose & Movement Heuristics",
          available: true,
          status_detail: "High-frequency local differential optical flow and movement tracking",
          is_offline_ready: true
        },
        {
          name: "Privacy & Consent Layer",
          available: true,
          status_detail: "Local SQLite consent flags enforced. Anonymized participant identifiers.",
          is_offline_ready: true
        },
        {
          name: "Offline Rule-Based Recommendations",
          available: true,
          status_detail: "Deterministic pedagogical recommendation engine running 100% locally",
          is_offline_ready: true
        }
      ]
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      error: err.message
    }, { status: 500 });
  }
}
