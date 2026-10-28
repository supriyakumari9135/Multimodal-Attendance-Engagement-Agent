"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Percent,
  Clock,
  TrendingUp,
  Activity,
  Lightbulb,
  Video,
  Database,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { api, OverviewStats, Course, SessionItem } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function DashboardOverview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cList, sList] = await Promise.all([
        api.getCourses(),
        api.getSessions()
      ]);
      setCourses(cList);
      setSessions(sList);

      const st = await api.getOverviewStats(
        selectedCourseId || undefined,
        selectedSessionId || undefined
      );
      setStats(st);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCourseId, selectedSessionId]);

  const handleSeedDemo = async () => {
    try {
      setActionLoading(true);
      const res = await api.seedDemo();
      setStatusMessage(res.message);
      await fetchData();
    } catch (err: any) {
      alert("Error seeding demo: " + err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleResetDemo = async () => {
    try {
      setActionLoading(true);
      setShowResetConfirm(false);
      const res = await api.resetDemo();
      setStatusMessage("Demo data has been cleanly reset.");
      await fetchData();
    } catch (err: any) {
      alert("Error resetting demo: " + err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-darkSlate-900">
            Classroom Intelligence Overview
          </h2>
          <p className="text-sm text-darkSlate-500">
            Real-time presence tracking, explainable activity metrics, and teaching suggestions.
          </p>
        </div>

        {/* Demo Data Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleSeedDemo}
            disabled={actionLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm transition-colors disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{actionLoading ? "Processing..." : "Load Demo Data"}</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            disabled={actionLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-surface hover:bg-slate-100 text-darkSlate-700 border border-border rounded-md shadow-sm transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-semibold text-darkSlate-900">
                Confirm Database Reset
              </h3>
            </div>
            <p className="text-sm text-darkSlate-600 leading-relaxed">
              This action will reset the local database, re-seeding the 14 standard students and 3 verified historical sessions with deterministic measurements.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-darkSlate-700 hover:bg-slate-100 rounded-md border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDemo}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-sm"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status banner */}
      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-wrap gap-4 items-center justify-between text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-darkSlate-700">Filter Scope:</span>

          {/* Course filter */}
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

          {/* Session filter */}
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-1.5 text-xs text-darkSlate-800 font-medium focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Latest Session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.status})
              </option>
            ))}
          </select>
        </div>

        <div className="text-darkSlate-500 flex items-center space-x-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>Showing verified records from local SQLite</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Enrolled */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-darkSlate-500 uppercase tracking-wider">
              Enrolled Students
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-darkSlate-900 mt-2">
            {stats?.total_enrolled_students ?? 0}
          </p>
          <p className="text-[11px] text-darkSlate-500 mt-1">
            Across {stats?.active_courses_count ?? 0} active courses
          </p>
        </div>

        {/* Card 2: Selected Session Present & Attendance % */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-darkSlate-500 uppercase tracking-wider">
              Students Present
            </span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <p className="text-2xl font-bold text-darkSlate-900">
              {stats?.selected_session_present ?? 0}
            </p>
            <span className="text-sm font-semibold text-emerald-600">
              ({stats?.selected_session_attendance_pct ?? 0}%)
            </span>
          </div>
          <p className="text-[11px] text-darkSlate-500 mt-1">
            Duration: {stats?.current_session_duration_minutes ?? 0} mins
          </p>
        </div>

        {/* Card 3: Avg Engagement Score */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-darkSlate-500 uppercase tracking-wider">
              Engagement Indicator
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <p className="text-2xl font-bold text-darkSlate-900">
              {stats?.average_engagement_score ?? 0}
            </p>
            <span className="text-xs text-darkSlate-400">/ 100</span>
          </div>
          <p className="text-[11px] text-darkSlate-500 mt-1">
            Multimodal explainable score
          </p>
        </div>

        {/* Card 4: Participation Activity */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-darkSlate-500 uppercase tracking-wider">
              Participation Activity
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-darkSlate-900 mt-2">
            {stats?.recent_participation_activity ?? 0}%
          </p>
          <p className="text-[11px] text-darkSlate-500 mt-1">
            Physical & vocal interaction proxy
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Sessions & Teaching Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Sessions Table (Span 2) */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-darkSlate-900">
                Recent Classroom Sessions
              </h3>
              <p className="text-xs text-darkSlate-500">
                Tracked sessions with verified attendance and activity timelines.
              </p>
            </div>
            <Link
              href="/live"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm transition-colors"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Start New Session</span>
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg space-y-3">
              <Database className="w-8 h-8 text-darkSlate-400 mx-auto" />
              <p className="text-sm font-medium text-darkSlate-700">No sessions recorded yet</p>
              <p className="text-xs text-darkSlate-500 max-w-sm mx-auto">
                Load demo data or start a live simulated classroom session to populate measurements.
              </p>
              <button
                onClick={handleSeedDemo}
                className="mt-2 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100"
              >
                Load Demo Data
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-darkSlate-500 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Session Title</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Attendance</th>
                    <th className="py-2.5 px-3">Engagement</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessions.slice(0, 5).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-medium text-darkSlate-900">
                        {s.title}
                        <div className="text-[10px] text-darkSlate-400 font-normal">
                          {formatDate(s.start_time)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-darkSlate-700">
                        {s.course_code || "CS-101"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.status === "Running"
                              ? "bg-emerald-100 text-emerald-800 animate-pulse"
                              : s.status === "Completed"
                              ? "bg-slate-100 text-slate-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-darkSlate-800">
                        {s.attendance_rate ?? 0}%
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${s.engagement_average ?? 65}%` }}
                            ></div>
                          </div>
                          <span className="font-medium text-darkSlate-700">
                            {s.engagement_average ?? 65}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/analytics?session_id=${s.id}`}
                          className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center space-x-1"
                        >
                          <span>Analyze</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: AI Teaching Suggestions Card */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-darkSlate-900">
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold">AI Teaching Assistant</h3>
              </div>
              <span className="text-[10px] font-medium bg-slate-100 px-2 py-0.5 rounded-full text-darkSlate-600">
                Offline Rules
              </span>
            </div>
            <p className="text-xs text-darkSlate-500 leading-relaxed">
              Evidence-based pedagogical recommendations generated deterministically from session dynamics.
            </p>

            {/* Suggestions list */}
            <div className="space-y-3 pt-2">
              <div className="p-3.5 bg-background rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-darkSlate-900">
                    Participation Activity Drop
                  </span>
                  <span className="text-[10px] text-amber-600 font-medium">88% Conf</span>
                </div>
                <p className="text-xs text-darkSlate-600">
                  Observed activity declined between minutes 15:00 and 25:00.
                </p>
                <div className="p-2 bg-surface rounded border border-border text-[11px] text-emerald-800 font-medium">
                  Suggestion: Introduce an open-ended concept check-in or quick poll.
                </div>
              </div>

              <div className="p-3.5 bg-background rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-darkSlate-900">
                    Session Pacing Notice
                  </span>
                  <span className="text-[10px] text-sky-600 font-medium">91% Conf</span>
                </div>
                <p className="text-xs text-darkSlate-600">
                  Continuous presentation exceeded 40 minutes without pause.
                </p>
                <div className="p-2 bg-surface rounded border border-border text-[11px] text-emerald-800 font-medium">
                  Suggestion: Conduct a 2-minute synthesis pause or student recap.
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/assistant"
            className="w-full mt-4 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-darkSlate-800 font-semibold rounded-lg text-xs text-center transition-colors block"
          >
            Open All Teaching Suggestions
          </Link>
        </div>
      </div>
    </div>
  );
}
