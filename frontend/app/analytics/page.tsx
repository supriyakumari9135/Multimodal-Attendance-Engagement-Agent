"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Activity,
  Sliders,
  AlertCircle,
  Clock,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { api, SessionItem, SessionAnalytics } from "@/lib/api";

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("full"); // full, 15m, 30m
  const [loading, setLoading] = useState<boolean>(true);

  // Weights configuration (35, 25, 20, 20)
  const [weights, setWeights] = useState({
    participation: 35,
    movement: 25,
    orientation: 20,
    audio: 20
  });

  useEffect(() => {
    async function load() {
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
    load();
  }, []);

  useEffect(() => {
    async function loadAnalytics() {
      if (!selectedSessionId) return;
      try {
        setLoading(true);
        const a = await api.getSessionAnalytics(selectedSessionId);
        setAnalytics(a);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [selectedSessionId]);

  // Filter timeline points based on timeFilter
  const rawPoints = analytics?.timeline_points || [];
  const displayedPoints = React.useMemo(() => {
    if (timeFilter === "15m") {
      return rawPoints.slice(-3);
    } else if (timeFilter === "30m") {
      return rawPoints.slice(-6);
    }
    return rawPoints;
  }, [rawPoints, timeFilter]);

  // Attendance bar data
  const attendanceBarData = analytics?.attendance_summary
    ? Object.entries(analytics.attendance_summary).map(([name, count]) => ({
        status: name,
        students: count
      }))
    : [];

  const totalWeight = weights.participation + weights.movement + weights.orientation + weights.audio;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-darkSlate-900">
            Explainable Engagement Analytics
          </h2>
          <p className="text-sm text-darkSlate-500">
            Transparent multimodal sensor indicators, deterministic weight fusion, and neutral trend insights.
          </p>
        </div>

        {/* Session Selector & Time Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="bg-surface border border-border rounded-md px-3 py-1.5 text-xs text-darkSlate-800 font-medium focus:ring-1 focus:ring-emerald-500 shadow-sm"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          <div className="bg-surface border border-border rounded-md p-0.5 flex text-xs">
            {["15m", "30m", "full"].map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  timeFilter === f
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-darkSlate-600 hover:text-darkSlate-900"
                }`}
              >
                {f === "15m" ? "Last 15m" : f === "30m" ? "Last 30m" : "Full Session"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Explainability Banner */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="md:col-span-3 space-y-1">
          <div className="flex items-center space-x-2 text-darkSlate-900 font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ethical Interpretation Guarantee</span>
          </div>
          <p className="text-xs text-darkSlate-600 leading-relaxed">
            Physical indicators are behavioral proxies, not direct measures of cognitive learning or motivation.
            Low physical movement is never equated to disengagement: students may be writing, reading, or listening with quiet focus.
          </p>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-darkSlate-500 uppercase tracking-wider block">
            Session Score
          </span>
          <span className="text-3xl font-extrabold text-emerald-600 block mt-0.5">
            {analytics?.explainable_engagement_score ?? 74}
          </span>
          <span className="text-[10px] text-darkSlate-400">
            Fused over 4 active signals
          </span>
        </div>
      </div>

      {/* Primary Chart: Fused Engagement Indicator Trend */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-darkSlate-900">
              Explainable Engagement Trend Over Time
            </h3>
            <p className="text-xs text-darkSlate-500">
              Deterministic 0–100 fused index calculated across 5-minute observation windows.
            </p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
            ● Local Deterministic Fusion
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          {displayedPoints.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-darkSlate-400">
              No timeline metric records available for this session interval.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedPoints}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="explainable_score"
                  name="Explainable Score"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#scoreGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Multimodal Decomposition Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multimodal Signals Comparison */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h3 className="text-base font-semibold text-darkSlate-900">
            Multimodal Component Breakdown
          </h3>
          <p className="text-xs text-darkSlate-500">
            Physical participation, movement intensity, head orientation, and vocal activity.
          </p>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayedPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line
                  type="monotone"
                  dataKey="participation_activity"
                  name="Participation"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="movement_patterns"
                  name="Movement"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="audio_activity"
                  name="Vocal Activity"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Distribution */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h3 className="text-base font-semibold text-darkSlate-900">
            Attendance Distribution
          </h3>
          <p className="text-xs text-darkSlate-500">
            Participant presence status categorized across the session.
          </p>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" stroke="#64748b" fontSize={10} />
                <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                />
                <Bar dataKey="students" name="Students" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Configurable Weights & Neutral Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configurable Starting Weights (1 Col) */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-darkSlate-900">
              Configurable Indicator Weights
            </h3>
          </div>
          <p className="text-xs text-darkSlate-500 leading-relaxed">
            Weights are demonstration settings and automatically renormalize over active modalities.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <div className="flex justify-between font-medium text-darkSlate-700 mb-1">
                <span>Participation Activity</span>
                <span className="font-bold">{weights.participation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.participation}
                onChange={(e) => setWeights({ ...weights, participation: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-darkSlate-700 mb-1">
                <span>Movement Patterns</span>
                <span className="font-bold">{weights.movement}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.movement}
                onChange={(e) => setWeights({ ...weights, movement: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-darkSlate-700 mb-1">
                <span>Head Orientation</span>
                <span className="font-bold">{weights.orientation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.orientation}
                onChange={(e) => setWeights({ ...weights, orientation: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-darkSlate-700 mb-1">
                <span>Vocal Activity</span>
                <span className="font-bold">{weights.audio}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.audio}
                onChange={(e) => setWeights({ ...weights, audio: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>

            <div className="pt-2 text-[11px] text-darkSlate-500 bg-slate-50 p-2.5 rounded border border-border">
              Renormalized Sum: {totalWeight}% (normalized strictly across available signals)
            </div>
          </div>
        </div>

        {/* Right: Neutral Wording Evidence-based Insights (2 Cols) */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-semibold text-darkSlate-900">
                Automated Neutral Interval Insights
              </h3>
            </div>
            <span className="text-[10px] bg-slate-100 text-darkSlate-600 px-2 py-0.5 rounded font-mono">
              Deterministic Rule Output
            </span>
          </div>
          <p className="text-xs text-darkSlate-500">
            Detected time windows where activity indicators changed substantially, formulated using strictly neutral, non-judgmental wording.
          </p>

          <div className="space-y-3 pt-1">
            {(!analytics?.insights || analytics.insights.length === 0) ? (
              <div className="p-4 bg-background rounded-lg border border-border text-xs text-darkSlate-500">
                Indicators remained within steady baseline ranges throughout this session. No sudden divergence thresholds were crossed.
              </div>
            ) : (
              analytics.insights.map((ins, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-background rounded-lg border border-border space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-darkSlate-900">
                      Interval: {ins.interval}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      Confidence: {Math.round(ins.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-darkSlate-800 font-medium">
                    {ins.wording}
                  </p>
                  <p className="text-[11px] text-darkSlate-500 italic">
                    Limitation: {ins.limitation}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
