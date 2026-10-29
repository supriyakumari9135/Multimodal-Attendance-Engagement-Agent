import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    let row = db.prepare("SELECT * FROM privacy_settings WHERE id = 'default'").get() as any;
    if (!row) {
      db.prepare(`
        INSERT INTO privacy_settings (id, media_retention_hours, auto_delete_recordings, allow_face_detection, allow_audio_analysis, consent_enforced, anonymous_tracks_only, updated_at)
        VALUES ('default', 24, 1, 1, 1, 1, 0, datetime('now'))
      `).run();
      row = db.prepare("SELECT * FROM privacy_settings WHERE id = 'default'").get() as any;
    }

    return NextResponse.json({
      media_retention_hours: row.media_retention_hours,
      auto_delete_recordings: Boolean(row.auto_delete_recordings),
      allow_face_detection: Boolean(row.allow_face_detection),
      allow_audio_analysis: Boolean(row.allow_audio_analysis),
      consent_enforced: Boolean(row.consent_enforced),
      anonymous_tracks_only: Boolean(row.anonymous_tracks_only),
      updated_at: row.updated_at
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const db = getDb();
    const now = new Date().toISOString();

    const current = db.prepare("SELECT * FROM privacy_settings WHERE id = 'default'").get() as any;

    const mediaHours = body.media_retention_hours !== undefined ? body.media_retention_hours : current.media_retention_hours;
    const autoDel = body.auto_delete_recordings !== undefined ? (body.auto_delete_recordings ? 1 : 0) : current.auto_delete_recordings;
    const faceDet = body.allow_face_detection !== undefined ? (body.allow_face_detection ? 1 : 0) : current.allow_face_detection;
    const audioAn = body.allow_audio_analysis !== undefined ? (body.allow_audio_analysis ? 1 : 0) : current.allow_audio_analysis;
    const consentEnf = body.consent_enforced !== undefined ? (body.consent_enforced ? 1 : 0) : current.consent_enforced;
    const anonOnly = body.anonymous_tracks_only !== undefined ? (body.anonymous_tracks_only ? 1 : 0) : current.anonymous_tracks_only;

    db.prepare(`
      UPDATE privacy_settings
      SET media_retention_hours = ?,
          auto_delete_recordings = ?,
          allow_face_detection = ?,
          allow_audio_analysis = ?,
          consent_enforced = ?,
          anonymous_tracks_only = ?,
          updated_at = ?
      WHERE id = 'default'
    `).run(mediaHours, autoDel, faceDet, audioAn, consentEnf, anonOnly, now);

    return NextResponse.json({
      media_retention_hours: mediaHours,
      auto_delete_recordings: Boolean(autoDel),
      allow_face_detection: Boolean(faceDet),
      allow_audio_analysis: Boolean(audioAn),
      consent_enforced: Boolean(consentEnf),
      anonymous_tracks_only: Boolean(anonOnly),
      updated_at: now
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
