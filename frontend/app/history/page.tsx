"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Calendar,
  FileSpreadsheet,
  FileText,
  Clock,
  ArrowRight,
  UserCheck,
  TrendingUp,
  Download
} from "lucide-react";
import { api, SessionItem, Course } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [sList, cList] = await Promise.all([
          api.getSessions(selectedCourseId || undefined),
          api.getCourses()
        ]);
        setSessions(sList);
        setCourses(cList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCourseId]);

  const filteredSessions = sessions.filter((s) => {
    return (
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.course_code && s.course_code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-darkSlate-900">
            Session History & Archives
          </h2>
          <p className="text-sm text-darkSlate-500">
            Comprehensive archive of recorded classroom sessions, attendance tallies, and downloadable reports.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-wrap gap-4 items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-darkSlate-700">Course:</span>
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
            placeholder="Search by title or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-md text-xs text-darkSlate-900 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-darkSlate-500">
            Loading session archive...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-darkSlate-500 bg-surface rounded-xl border border-border">
            No historical sessions matching search filters.
          </div>
        ) : (
          filteredSessions.map((s) => (
            <div
              key={s.id}
              className="bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    {s.course_code || "CS-101"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      s.status === "Running"
                        ? "bg-emerald-100 text-emerald-800 animate-pulse"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-darkSlate-900 line-clamp-1">
                  {s.title}
                </h3>
                <p className="text-xs text-darkSlate-500">
                  {formatDate(s.start_time)}
                </p>

                {/* Key Metrics Pill Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="bg-background p-2.5 rounded-lg border border-border">
                    <span className="text-[10px] text-darkSlate-500 block">Attendance Rate</span>
                    <span className="text-base font-bold text-emerald-600">
                      {s.attendance_rate ?? 0}%
                    </span>
                  </div>

                  <div className="bg-background p-2.5 rounded-lg border border-border">
                    <span className="text-[10px] text-darkSlate-500 block">Avg Engagement</span>
                    <span className="text-base font-bold text-darkSlate-800">
                      {s.engagement_average ?? 70}
                      <span className="text-xs font-normal text-darkSlate-400">/100</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: CSV, PDF, Analytics */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5">
                  <a
                    href={api.getCsvReportUrl(s.id)}
                    download
                    title="Download CSV Register"
                    className="p-1.5 rounded-md hover:bg-slate-100 text-darkSlate-600 transition-colors border border-border"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  </a>

                  <a
                    href={api.getPdfReportUrl(s.id)}
                    download
                    title="Download PDF Intelligence Report"
                    className="p-1.5 rounded-md hover:bg-slate-100 text-darkSlate-600 transition-colors border border-border"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-600" />
                  </a>
                </div>

                <Link
                  href={`/analytics?session_id=${s.id}`}
                  className="inline-flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 font-semibold text-xs"
                >
                  <span>View Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

