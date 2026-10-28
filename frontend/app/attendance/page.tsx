"use client";

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Search,
  Filter,
  Edit2,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  FileSpreadsheet
} from "lucide-react";
import { api, SessionItem, AttendanceRecord } from "@/lib/api";
import { formatTime, formatDate } from "@/lib/utils";

export default function AttendancePage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);

  // Correction Modal State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<string>("Present");
  const [correctionNotes, setCorrectionNotes] = useState<string>("");
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadSessions() {
      try {
        const sList = await api.getSessions();
        setSessions(sList);
        if (sList.length > 0) {
          setSelectedSessionId(sList[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSessions();
  }, []);

  const loadAttendance = async (sessId: string) => {
    if (!sessId) return;
    try {
      setLoading(true);
      const att = await api.getSessionAttendance(sessId);
      setRecords(att);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      loadAttendance(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleSaveCorrection = async () => {
    if (!editingRecord || !selectedSessionId) return;
    try {
      setSaveLoading(true);
      await api.correctAttendance(selectedSessionId, editingRecord.id, {
        status: newStatus,
        notes: correctionNotes || "Teacher manual verification"
      });
      setEditingRecord(null);
      setCorrectionNotes("");
      await loadAttendance(selectedSessionId);
    } catch (err: any) {
      alert("Error saving correction: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      (r.student_name && r.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.student_code && r.student_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.anonymous_track_id && r.anonymous_track_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, corrected: boolean) => {
    let colorClass = "bg-slate-100 text-slate-700";
    if (status === "Present") colorClass = "bg-emerald-100 text-emerald-800";
    else if (status === "Late") colorClass = "bg-amber-100 text-amber-800";
    else if (status === "Left early") colorClass = "bg-orange-100 text-orange-800";
    else if (status === "Absent") colorClass = "bg-rose-100 text-rose-800";
    else if (status === "Manually confirmed") colorClass = "bg-sky-100 text-sky-800";

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${colorClass}`}>
        {status}
        {corrected && <span className="ml-1 text-[9px] font-normal underline">(Audited)</span>}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-darkSlate-900">
            Automated Attendance Register
          </h2>
          <p className="text-sm text-darkSlate-500">
            Evidence-based presence records with sustained-duration tracking and teacher verification audit trail.
          </p>
        </div>

        {selectedSessionId && (
          <a
            href={api.getCsvReportUrl(selectedSessionId)}
            download
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-surface hover:bg-slate-100 text-darkSlate-700 border border-border rounded-md shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Register (CSV)</span>
          </a>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-wrap gap-4 items-center justify-between text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <label className="font-semibold text-darkSlate-700">Session:</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-1.5 text-xs text-darkSlate-800 font-medium focus:ring-1 focus:ring-emerald-500"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.course_code || "Class"})
              </option>
            ))}
          </select>

          <label className="font-semibold text-darkSlate-700 ml-2">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-1.5 text-xs text-darkSlate-800 font-medium focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Left early">Left early</option>
            <option value="Manually confirmed">Manually confirmed</option>
            <option value="Unverified">Unverified</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-darkSlate-400" />
          <input
            type="text"
            placeholder="Search by student name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-md text-xs text-darkSlate-900 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-darkSlate-600 flex items-center space-x-2.5">
        <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span>
          Anonymous tracks are never converted to student names without verified local consent. All manual teacher corrections are permanently recorded in the audit log.
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-darkSlate-500">
            Loading attendance records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-xs text-darkSlate-500">
            No attendance records matching filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border text-darkSlate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student ID / Track</th>
                  <th className="py-3 px-4">Display Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Observed Duration</th>
                  <th className="py-3 px-4">First / Last Seen</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-darkSlate-900">
                      {r.student_code || r.anonymous_track_id || "Track"}
                    </td>
                    <td className="py-3 px-4 font-medium text-darkSlate-800">
                      {r.student_name || "Unassociated Track"}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(r.status, r.manually_corrected)}
                    </td>
                    <td className="py-3 px-4 text-darkSlate-700">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTime(r.observed_duration)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-darkSlate-500">
                      {r.first_seen ? (
                        <>
                          <span>{new Date(r.first_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {" - "}
                          <span>{r.last_seen ? new Date(r.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "present"}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-darkSlate-600 font-medium">
                      {Math.round(r.confidence * 100)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingRecord(r);
                          setNewStatus(r.status);
                        }}
                        className="inline-flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Correct</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Correction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-darkSlate-900">
              Teacher Attendance Correction
            </h3>
            <p className="text-xs text-darkSlate-500 leading-relaxed">
              Manually modify the recorded attendance state for <b>{editingRecord.student_name || editingRecord.anonymous_track_id}</b>. This correction will be permanently logged in the audit trail.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-darkSlate-700 mb-1">
                  Adjust Status:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-darkSlate-900 font-medium focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Left early">Left early</option>
                  <option value="Manually confirmed">Manually confirmed</option>
                  <option value="Unverified">Unverified</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-darkSlate-700 mb-1">
                  Teacher Audit Note / Reason:
                </label>
                <textarea
                  rows={3}
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  placeholder="e.g. Student was seated out of primary camera cone and confirmed presence in person."
                  className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-darkSlate-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 text-xs font-medium text-darkSlate-700 hover:bg-slate-100 rounded-md border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCorrection}
                disabled={saveLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm disabled:opacity-50"
              >
                {saveLoading ? "Saving..." : "Save & Audit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
