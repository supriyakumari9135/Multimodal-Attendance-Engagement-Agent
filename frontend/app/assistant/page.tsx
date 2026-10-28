"use client";

import React, { useState, useEffect } from "react";
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Filter
} from "lucide-react";
import { api, SessionItem, Recommendation } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function TeachingAssistantPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);

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

  const loadRecommendations = async (sessId: string) => {
    if (!sessId) return;
    try {
      setLoading(true);
      const recs = await api.getSessionRecommendations(sessId);
      setRecommendations(recs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      loadRecommendations(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleUpdateStatus = async (recId: string, status: string) => {
    try {
      await api.updateRecommendationStatus(recId, status);
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, status } : r))
      );
    } catch (err: any) {
      alert("Error updating status: " + err.message);
    }
  };

  const filteredRecs = recommendations.filter(
    (r) => statusFilter === "ALL" || r.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-darkSlate-900">
            AI Teaching Assistant
          </h2>
          <p className="text-sm text-darkSlate-500">
            Evidence-based, offline-first pedagogical suggestions derived from deterministic session indicators.
          </p>
        </div>

        {/* Session Filter */}
        <div className="flex items-center space-x-2.5">
          <label className="text-xs font-semibold text-darkSlate-700">Session:</label>
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
        </div>
      </div>

      {/* Offline Assurance Banner */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-xs text-emerald-900">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block">100% Deterministic & Offline Pedagogical Engine</span>
          <p className="text-emerald-800/90 leading-relaxed text-[11px] mt-0.5">
            Recommendations are evaluated entirely by local rules examining participation shifts, pacing duration, and vocal continuity.
            No cloud APIs, third-party analytics, or LLMs are involved in generating these suggestions.
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-border pb-2 text-xs">
        {["ALL", "active", "accepted", "completed", "dismissed"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === st
                ? "bg-slate-900 text-white"
                : "text-darkSlate-600 hover:text-darkSlate-900 hover:bg-slate-100"
            }`}
          >
            {st.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-darkSlate-500 bg-surface rounded-xl border border-border">
            Evaluating session rules...
          </div>
        ) : filteredRecs.length === 0 ? (
          <div className="p-12 text-center text-xs text-darkSlate-500 bg-surface rounded-xl border border-border">
            No recommendations currently matching status filter.
          </div>
        ) : (
          filteredRecs.map((r) => (
            <div
              key={r.id}
              className="bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg flex-shrink-0 mt-0.5">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-darkSlate-900">
                      {r.title}
                    </h3>
                    <p className="text-xs text-darkSlate-500 mt-0.5">
                      {formatDate(r.created_at)} &bull; Confidence: {Math.round(r.confidence * 100)}%
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                    r.status === "active"
                      ? "bg-amber-100 text-amber-800"
                      : r.status === "accepted"
                      ? "bg-emerald-100 text-emerald-800"
                      : r.status === "completed"
                      ? "bg-sky-100 text-sky-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {r.status}
                </span>
              </div>

              {/* Explanation & Observation Evidence */}
              <div className="bg-background rounded-lg p-3.5 border border-border text-xs text-darkSlate-700 space-y-2">
                <p className="leading-relaxed">{r.explanation}</p>
                {r.evidence_json && Object.keys(r.evidence_json).length > 0 && (
                  <div className="text-[11px] text-darkSlate-500 font-mono bg-surface p-2 rounded border border-border">
                    Evidence: {JSON.stringify(r.evidence_json)}
                  </div>
                )}
              </div>

              {/* Action Suggestion */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-xs text-emerald-950 font-medium space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                  Suggested Teacher Intervention:
                </span>
                <p>{r.suggested_action}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-1 text-xs">
                {r.status === "active" && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(r.id, "accepted")}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold transition-colors shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept Suggestion</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(r.id, "dismissed")}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-surface hover:bg-slate-100 text-darkSlate-700 border border-border rounded-md font-medium transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Dismiss</span>
                    </button>
                  </>
                )}

                {r.status === "accepted" && (
                  <button
                    onClick={() => handleUpdateStatus(r.id, "completed")}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-md font-semibold transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Completed</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
