import io
import csv
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_session_csv(
    session_data: Dict[str, Any],
    attendance_records: List[Dict[str, Any]],
    metrics: List[Dict[str, Any]],
    recommendations: List[Dict[str, Any]]
) -> str:
    """
    Generates a full CSV report string for a session.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header metadata
    writer.writerow(["MULTIMODAL ATTENDANCE & ENGAGEMENT AGENT - SESSION REPORT"])
    writer.writerow(["Generated At", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")])
    writer.writerow(["Session Title", session_data.get("title", "")])
    writer.writerow(["Course", f"{session_data.get('course_code', '')} - {session_data.get('course_name', '')}"])
    writer.writerow(["Status", session_data.get("status", "")])
    writer.writerow(["Input Mode", session_data.get("input_mode", "")])
    writer.writerow(["Start Time", str(session_data.get("start_time", ""))])
    writer.writerow(["End Time", str(session_data.get("end_time", ""))])
    writer.writerow([])

    # Privacy & Methodology disclaimer
    writer.writerow(["PRIVACY & METHODOLOGY STATEMENT"])
    writer.writerow([
        "Notice",
        "Indicators are proxy measurements. Low movement is not proof of disengagement. "
        "No emotion or psychological profiling is performed."
    ])
    writer.writerow([])

    # Attendance Section
    writer.writerow(["ATTENDANCE REGISTER"])
    writer.writerow(["Track/Student ID", "Student Name", "Status", "Observed Duration (sec)", "First Seen", "Last Seen", "Manually Corrected", "Confidence"])
    for rec in attendance_records:
        writer.writerow([
            rec.get("student_code") or rec.get("anonymous_track_id") or "Anonymous",
            rec.get("student_name") or "Unassociated Track",
            rec.get("status", "Unverified"),
            round(rec.get("observed_duration", 0), 1),
            rec.get("first_seen") or "N/A",
            rec.get("last_seen") or "N/A",
            "Yes" if rec.get("manually_corrected") else "No",
            rec.get("confidence", 1.0)
        ])
    writer.writerow([])

    # Metrics Section
    writer.writerow(["ENGAGEMENT TIMELINE METRICS"])
    writer.writerow(["Interval Start", "Interval End", "Metric Name", "Value (0-100)", "Modality", "Confidence"])
    for m in metrics:
        writer.writerow([
            m.get("interval_start"),
            m.get("interval_end"),
            m.get("metric_name"),
            m.get("metric_value"),
            m.get("source_modality"),
            m.get("confidence")
        ])
    writer.writerow([])

    # Recommendations Section
    writer.writerow(["AI TEACHING ASSISTANT RECOMMENDATIONS"])
    writer.writerow(["Title", "Explanation", "Suggested Action", "Status", "Confidence"])
    for r in recommendations:
        writer.writerow([
            r.get("title"),
            r.get("explanation"),
            r.get("suggested_action"),
            r.get("status"),
            r.get("confidence")
        ])

    return output.getvalue()


def generate_session_pdf(
    session_data: Dict[str, Any],
    attendance_records: List[Dict[str, Any]],
    metrics: List[Dict[str, Any]],
    recommendations: List[Dict[str, Any]]
) -> bytes:
    """
    Generates a professional PDF report binary buffer using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=14
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#16a34a'),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155')
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Italic'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748b'),
        spaceBefore=8,
        spaceAfter=8
    )

    # Document Header
    story.append(Paragraph("Multimodal Attendance & Engagement Agent", title_style))
    story.append(Paragraph(f"Official Session Intelligence Report &bull; Generated {datetime.utcnow().strftime('%b %d, %Y %H:%M UTC')}", subtitle_style))
    story.append(Spacer(1, 4))

    # Metadata Table
    meta_data = [
        [Paragraph("<b>Session Title:</b>", body_style), Paragraph(str(session_data.get("title", "")), body_style)],
        [Paragraph("<b>Course:</b>", body_style), Paragraph(f"{session_data.get('course_code', '')} - {session_data.get('course_name', '')}", body_style)],
        [Paragraph("<b>Input Mode:</b>", body_style), Paragraph(str(session_data.get("input_mode", "")), body_style)],
        [Paragraph("<b>Session Status:</b>", body_style), Paragraph(str(session_data.get("status", "")), body_style)],
        [Paragraph("<b>Attendance Rate:</b>", body_style), Paragraph(f"{session_data.get('attendance_rate', 0)}%", body_style)],
        [Paragraph("<b>Avg Engagement:</b>", body_style), Paragraph(f"{session_data.get('engagement_average', 0)} / 100", body_style)]
    ]
    meta_table = Table(meta_data, colWidths=[130, 410])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#f1f5f9')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Disclaimer
    story.append(Paragraph(
        "<b>Ethical Assurance & Privacy Notice:</b> Physical indicators (e.g. movement, orientation) are behavioral proxies, "
        "not absolute measures of cognitive comprehension. Offline processing only. No facial emotion or psychological inference.",
        disclaimer_style
    ))

    # Attendance Register Table
    story.append(Paragraph("Attendance Register Summary", heading_style))
    att_rows = [["ID / Track", "Student Name", "Status", "Duration", "Source", "Confidence"]]
    for r in attendance_records[:15]:  # top records
        att_rows.append([
            r.get("student_code") or r.get("anonymous_track_id", "Track"),
            r.get("student_name", "Anonymous"),
            r.get("status", "Unverified"),
            f"{int(r.get('observed_duration', 0))}s",
            r.get("source", "vision"),
            f"{int(r.get('confidence', 1.0)*100)}%"
        ])

    att_table = Table(att_rows, colWidths=[80, 150, 80, 60, 90, 80])
    att_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16a34a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(att_table)

    # Teaching Assistant Recommendations
    if recommendations:
        story.append(Paragraph("Evidence-Based Teaching Suggestions", heading_style))
        for rec in recommendations[:3]:
            rec_text = f"<b>{rec.get('title')}:</b> {rec.get('explanation')}<br/><i>Action: {rec.get('suggested_action')}</i>"
            story.append(Paragraph(rec_text, body_style))
            story.append(Spacer(1, 4))

    doc.build(story)
    return buffer.getvalue()
