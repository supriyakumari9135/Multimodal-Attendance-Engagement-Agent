"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  FileCode,
  Download,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle
} from "lucide-react";
import { api, SessionItem } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const sList = await api.getSessions();
        setSessions(sList);
        if (sList.length > 0) {
          setSelectedSessionId(sList[0].id);
          setSelectedSession(sList[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    const found = sessions.find((s) => s.id === id) || null;
    setSelectedSession(found);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-darkSlate-900">
            Session Reports & Document Generator
          </h2>
          <p className="text-sm text-darkSlate-500">
            Export official attendance registers, multimodal metrics, and teaching suggestions in CSV, PDF, and JSON formats.
          </p>
        </div>
      </div>

      {/* Select Session Card */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6 space-y-4 max-w-2xl">
        <label className="block text-xs font-semibold text-darkSlate-700 uppercase tracking-wider">
          Select Classroom Session to Export:
        </label>
        <select
          value={selectedSessionId}
          onChange={(e) => handleSelectSession(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-darkSlate-900 font-medium focus:ring-1 focus:ring-emerald-500"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({s.course_code || "CS-101"}) &bull; {formatDate(s.start_time)}
            </option>
          ))}
        </select>

        {selectedSession && (
          <div className="p-4 bg-background rounded-lg border border-border text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-darkSlate-400 block">Course:</span>
                <span className="font-semibold text-darkSlate-800">
                  {selectedSession.course_code} - {selectedSession.course_name}
                </span>
              </div>
              <div>
                <span className="text-darkSlate-400 block">Session Status:</span>
                <span className="font-semibold text-emerald-700">{selectedSession.status}</span>
              </div>
              <div>
                <span className="text-darkSlate-400 block">Verified Attendance:</span>
                <span className="font-semibold text-darkSlate-800">{selectedSession.attendance_rate}%</span>
              </div>
              <div>
                <span className="text-darkSlate-400 block">Avg Engagement:</span>
                <span className="font-semibold text-darkSlate-800">{selectedSession.engagement_average} / 100</span>
              </div>
            </div>
          </div>
        )}

        {/* Download Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <a
            href={selectedSessionId ? api.getCsvReportUrl(selectedSessionId) : "#"}
            download
            className="flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors text-center"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download CSV Attendance Register</span>
          </a>

          <a
            href={selectedSessionId ? api.getPdfReportUrl(selectedSessionId) : "#"}
            download
            className="flex items-center justify-center space-x-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors text-center"
          >
            <FileText className="w-4 h-4" />
            <span>Download PDF Intelligence Report</span>
          </a>
        </div>
      </div>

      {/* Report Compliance & Disclaimer Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-w-2xl text-xs text-darkSlate-600 space-y-2">
        <div className="flex items-center space-x-2 text-slate-800 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Regulatory & Ethical Compliance Notice</span>
        </div>
        <p className="leading-relaxed text-[11px] text-darkSlate-500">
          Generated reports contain timestamped presence, teacher manual corrections, and explainable activity metrics.
          In compliance with offline privacy principles, no student facial templates or raw recordings are exported or stored.
        </p>
      </div>
    </div>
  );
}
