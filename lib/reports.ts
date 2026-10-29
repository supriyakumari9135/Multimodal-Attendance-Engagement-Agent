import PDFDocument from "pdfkit";
import { getDatabase } from "./db";

export function generateSessionCsv(sessionId: string): string {
  const db = getDatabase();
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as any;
  if (!session) throw new Error("Session not found");

  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(session.course_id) as any;
  const attendance = db.prepare(`
    SELECT a.*, s.student_code, s.display_name as student_name
    FROM attendance_records a
    LEFT JOIN students s ON a.student_id = s.id
    WHERE a.session_id = ?
    ORDER BY s.student_code ASC
  `).all(sessionId) as any[];

  const metrics = db.prepare(`
    SELECT * FROM engagement_metrics
    WHERE session_id = ?
    ORDER BY interval_start ASC
  `).all(sessionId) as any[];

  const lines: string[] = [];
  lines.push("=== MULTIMODAL ATTENDANCE & ENGAGEMENT AGENT REPORT ===");
  lines.push(`Session Title,${escapeCsv(session.title)}`);
  lines.push(`Course,${escapeCsv(course ? `${course.name} (${course.course_code})` : "N/A")}`);
  lines.push(`Status,${session.status}`);
  lines.push(`Start Time,${session.start_time || ""}`);
  lines.push(`End Time,${session.end_time || ""}`);
  lines.push(`Planned Duration (Mins),${session.planned_duration_minutes || 0}`);
  lines.push("");

  lines.push("=== ATTENDANCE RECORDS ===");
  lines.push("Student Code,Display Name,Status,First Seen,Last Seen,Observed Duration (sec),Source,Manual Override,Confidence");
  for (const r of attendance) {
    lines.push([
      escapeCsv(r.student_code || "Unknown"),
      escapeCsv(r.student_name || "Unknown"),
      r.status,
      r.first_seen || "",
      r.last_seen || "",
      r.observed_duration || 0,
      r.source || "automated_vision",
      r.manually_corrected ? "Yes" : "No",
      r.confidence || 1.0
    ].join(","));
  }
  lines.push("");

  lines.push("=== ENGAGEMENT TIMELINE METRICS ===");
  lines.push("Interval Start,Interval End,Metric Name,Metric Value,Confidence,Modality");
  for (const m of metrics) {
    lines.push([
      m.interval_start || "",
      m.interval_end || "",
      escapeCsv(m.metric_name || "explainable_score"),
      m.metric_value?.toFixed(1) || "0.0",
      m.confidence || 1.0,
      m.source_modality || "multimodal_fusion"
    ].join(","));
  }

  return lines.join("\n");
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes("\"") || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export async function generateSessionPdfBuffer(sessionId: string): Promise<Buffer> {
  const db = getDatabase();
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as any;
  if (!session) throw new Error("Session not found");

  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(session.course_id) as any;
  const attendance = db.prepare(`
    SELECT a.*, s.student_code, s.display_name as student_name
    FROM attendance_records a
    LEFT JOIN students s ON a.student_id = s.id
    WHERE a.session_id = ?
    ORDER BY s.student_code ASC
  `).all(sessionId) as any[];

  const recs = db.prepare(`
    SELECT * FROM recommendations
    WHERE session_id = ?
    ORDER BY created_at DESC
  `).all(sessionId) as any[];

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err: Error) => reject(err));

      // Header
      doc.fontSize(18).fillColor("#0f172a").text("Multimodal Attendance & Engagement Agent", { align: "left" });
      doc.fontSize(12).fillColor("#64748b").text("Session Intelligence & Privacy-Preserving Attendance Report", { align: "left" });
      doc.moveDown(0.5);
      doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Session Meta
      doc.fontSize(10).fillColor("#334155");
      doc.font("Helvetica-Bold").text(`Session Title: ${session.title}`);
      doc.font("Helvetica");
      doc.text(`Course: ${course ? `${course.name} (${course.course_code})` : "General Session"}`);
      doc.text(`Status: ${session.status} | Start: ${session.start_time || "N/A"} | End: ${session.end_time || "In Progress"}`);
      doc.moveDown(1);

      // Guardrail Notice
      doc.rect(40, doc.y, 515, 36).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#475569").fontSize(8).text(
        "Ethical AI Guardrail: Behavioral indicators are non-invasive proxies, not proof of cognitive attention, learning, or comprehension. Emotion profiling and automatic grading are prohibited by privacy policy.",
        48,
        doc.y - 30,
        { width: 500 }
      );
      doc.moveDown(2);

      // Attendance Summary
      const presentCount = attendance.filter((a) => a.status === "Present").length;
      const lateCount = attendance.filter((a) => a.status === "Late").length;
      const absentCount = attendance.filter((a) => a.status === "Absent").length;

      doc.fontSize(12).fillColor("#0f172a").text("Attendance Summary", 40, doc.y);
      doc.fontSize(9).fillColor("#334155").text(`Total Students: ${attendance.length} | Present: ${presentCount} | Late: ${lateCount} | Absent: ${absentCount}`);
      doc.moveDown(0.5);

      // Table Header
      let tableY = doc.y;
      doc.rect(40, tableY, 515, 20).fill("#f1f5f9");
      doc.fillColor("#0f172a").fontSize(8);
      doc.text("Student ID", 45, tableY + 6);
      doc.text("Display Name", 130, tableY + 6);
      doc.text("Status", 270, tableY + 6);
      doc.text("Sustained (s)", 350, tableY + 6);
      doc.text("Verification", 430, tableY + 6);

      let currentY = tableY + 22;
      for (const rec of attendance.slice(0, 25)) {
        if (currentY > 720) {
          doc.addPage();
          currentY = 40;
        }
        doc.fillColor(rec.status === "Present" ? "#16a34a" : rec.status === "Late" ? "#ca8a04" : "#dc2626");
        doc.fontSize(8);
        doc.text(rec.student_code || "-", 45, currentY);
        doc.fillColor("#334155");
        doc.text((rec.student_name || "Unknown").slice(0, 20), 130, currentY);
        doc.text(rec.status, 270, currentY);
        doc.text(String(rec.observed_duration || 0), 350, currentY);
        doc.text(rec.source || "automated_vision", 430, currentY);
        currentY += 16;
      }

      // Pedagogical Recommendations
      if (recs.length > 0 && currentY < 680) {
        doc.moveDown(1);
        doc.fontSize(12).fillColor("#0f172a").text("AI Teaching Assistant Recommendations", 40, currentY + 10);
        let recY = currentY + 28;
        for (const r of recs.slice(0, 3)) {
          doc.fontSize(8).fillColor("#1e293b").text(`* [${(r.status || "REC").toUpperCase()}] ${r.title}: ${r.suggested_action || r.explanation}`, 45, recY, { width: 490 });
          recY += 24;
        }
      }

      // Footer
      doc.fontSize(7).fillColor("#94a3b8").text("Generated offline by Multimodal Attendance & Engagement Agent | Local SQLite Verified", 40, 780, { align: "center", width: 515 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
