"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Upload,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  BookOpen
} from "lucide-react";
import { api, Student, Course } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newCourseId, setNewCourseId] = useState<string>("");
  const [addLoading, setAddLoading] = useState<boolean>(false);

  // CSV Import Modal State
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState<boolean>(false);

  // Student Attendance History Drawer State
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sList, cList] = await Promise.all([
        api.getStudents(searchTerm || undefined, selectedCourseId || undefined),
        api.getCourses()
      ]);
      setStudents(sList);
      setCourses(cList);
      if (cList.length > 0 && !newCourseId) {
        setNewCourseId(cList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCourseId, searchTerm]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      alert("Please provide student code and display name");
      return;
    }
    try {
      setAddLoading(true);
      await api.createStudent({
        student_code: newCode.trim(),
        display_name: newName.trim(),
        course_ids: newCourseId ? [newCourseId] : []
      });
      setShowAddModal(false);
      setNewCode("");
      setNewName("");
      await loadData();
    } catch (err: any) {
      alert("Error adding student: " + err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvFile) {
      alert("Please select a CSV file to import");
      return;
    }
    try {
      setImportLoading(true);
      const res = await api.importStudentsCsv(csvFile, selectedCourseId || undefined);
      setImportResult(res);
      await loadData();
    } catch (err: any) {
      alert("CSV import failed: " + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleViewHistory = async (studentId: string) => {
    try {
      setHistoryLoading(true);
      const hist = await api.getStudentAttendanceHistory(studentId);
      setSelectedStudentHistory(hist);
    } catch (err: any) {
      alert("Error loading student history: " + err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-darkSlate-900">
            Student & Course Management
          </h2>
          <p className="text-sm text-darkSlate-500">
            Enrolled student roster, privacy consent records, and individual attendance histories.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              setShowCsvModal(true);
              setImportResult(null);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-surface hover:bg-slate-100 text-darkSlate-700 border border-border rounded-md shadow-sm transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-wrap gap-4 items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-darkSlate-700">Course Filter:</span>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-1.5 text-xs text-darkSlate-800 font-medium focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code}: {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-darkSlate-400" />
          <input
            type="text"
            placeholder="Search student code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-md text-xs text-darkSlate-900 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-darkSlate-500">
            Loading student records...
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-darkSlate-500">
            No students found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border text-darkSlate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Display Name</th>
                  <th className="py-3 px-4">Enrolled Course</th>
                  <th className="py-3 px-4">Consent Status</th>
                  <th className="py-3 px-4">Enrolled On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-darkSlate-900">
                      {s.student_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-darkSlate-800">
                      {s.display_name}
                    </td>
                    <td className="py-3 px-4 text-darkSlate-600">
                      {s.courses.length > 0 ? s.courses.join(", ") : "CS-101"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span
                          title="Video Presence Consent"
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800"
                        >
                          Video ✓
                        </span>
                        <span
                          title="Audio Activity Consent"
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800"
                        >
                          Audio ✓
                        </span>
                        {s.consents?.identity_matching ? (
                          <span
                            title="Identity Matching Consented"
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800"
                          >
                            Identity ✓
                          </span>
                        ) : (
                          <span
                            title="Identity Matching Opted-Out"
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600"
                          >
                            Anonymous
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-darkSlate-500 text-[11px]">
                      {formatDate(s.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewHistory(s.id)}
                        className="inline-flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddStudent}
            className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-semibold text-darkSlate-900">
              Add New Student
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-darkSlate-700 mb-1">
                  Student ID / Code:
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. STU-1025"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-darkSlate-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-darkSlate-700 mb-1">
                  Full Display Name:
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Taylor Jenkins"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-darkSlate-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-darkSlate-700 mb-1">
                  Enrolled Course:
                </label>
                <select
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-darkSlate-900 font-medium focus:ring-1 focus:ring-emerald-500"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code}: {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 font-medium text-darkSlate-700 hover:bg-slate-100 rounded-md border border-border"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm disabled:opacity-50"
              >
                {addLoading ? "Saving..." : "Enroll Student"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV Import Modal with Row-Level Error Display */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-darkSlate-900">
              Import Student Roster from CSV
            </h3>
            <p className="text-xs text-darkSlate-500 leading-relaxed">
              Upload a UTF-8 CSV file containing <code>student_code</code> and <code>display_name</code> columns.
            </p>

            <div className="space-y-3 text-xs">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full bg-background border border-border rounded-md p-2 text-xs text-darkSlate-900"
              />

              {importResult && (
                <div className="p-3 bg-slate-50 border border-border rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between font-semibold text-darkSlate-800">
                    <span>Processed: {importResult.total_processed}</span>
                    <span className="text-emerald-700">Imported: {importResult.imported_count}</span>
                    <span className="text-sky-700">Updated: {importResult.updated_count}</span>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="pt-2 border-t border-border space-y-1">
                      <span className="font-semibold text-rose-700 block">Row-Level Import Errors:</span>
                      <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-rose-800">
                        {importResult.errors.map((err: any, idx: number) => (
                          <div key={idx}>
                            Row {err.row}: {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 font-medium text-darkSlate-700 hover:bg-slate-100 rounded-md border border-border"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                disabled={importLoading || !csvFile}
                className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm disabled:opacity-50"
              >
                {importLoading ? "Importing..." : "Process Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Attendance History Drawer */}
      {selectedStudentHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-darkSlate-900">
                  {selectedStudentHistory.display_name}
                </h3>
                <p className="text-xs text-darkSlate-500 font-mono">
                  {selectedStudentHistory.student_code}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-darkSlate-500 block">Attendance Rate</span>
                <span className="text-lg font-bold text-emerald-600">
                  {selectedStudentHistory.attendance_rate}%
                </span>
              </div>
            </div>

            {/* Attendance History List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-border text-xs">
              {selectedStudentHistory.history.length === 0 ? (
                <div className="py-6 text-center text-darkSlate-400">
                  No session attendance recorded yet for this student.
                </div>
              ) : (
                selectedStudentHistory.history.map((h: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-darkSlate-800 block">
                        {h.session_title}
                      </span>
                      <span className="text-[11px] text-darkSlate-400">
                        {formatDate(h.date)} &bull; Duration: {Math.round(h.observed_duration_seconds)}s
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        h.status === "Present"
                          ? "bg-emerald-100 text-emerald-800"
                          : h.status === "Late"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {h.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 text-xs">
              <button
                onClick={() => setSelectedStudentHistory(null)}
                className="px-4 py-2 font-medium text-darkSlate-700 hover:bg-slate-100 rounded-md border border-border"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

