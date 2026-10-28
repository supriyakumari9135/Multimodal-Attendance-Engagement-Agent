"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ShieldCheck,
  Lock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Database,
  Cpu,
  EyeOff,
  MicOff,
  Save
} from "lucide-react";
import { api, PrivacySettings, SessionItem } from "@/lib/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionToPurge, setSelectedSessionToPurge] = useState<string>("");
  const [showPurgeModal, setShowPurgeModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [ps, sList] = await Promise.all([
          api.getPrivacySettings(),
          api.getSessions()
        ]);
        setSettings(ps);
        setSessions(sList);
        if (sList.length > 0) {
          setSelectedSessionToPurge(sList[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await api.updatePrivacySettings(settings);
      setSettings(updated);
      setStatusMsg("Privacy and retention policies updated successfully.");
    } catch (err: any) {
      alert("Error saving settings: " + err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handlePurgeSessionData = async () => {
    if (!selectedSessionToPurge) return;
    try {
      setSaving(true);
      setShowPurgeModal(false);
      const res = await api.deleteSessionPrivacyData(selectedSessionToPurge);
      setStatusMsg(res.message);
    } catch (err: any) {
      alert("Error purging session data: " + err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-darkSlate-900">
            Privacy, Security & Offline Settings
          </h2>
          <p className="text-sm text-darkSlate-500">
            Hardware privacy controls, automatic media retention policies, and permanent deletion workflows.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving || !settings}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? "Saving..." : "Save Policies"}</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Offline Processing Architecture Guarantee */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6 space-y-4">
        <div className="flex items-center space-x-3 text-darkSlate-900">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Offline Architectural Guarantees</h3>
            <p className="text-xs text-darkSlate-500">
              The agent operates autonomously without external connectivity requirements.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3.5 bg-background rounded-lg border border-border space-y-1">
            <span className="font-semibold text-darkSlate-900 block">Zero Cloud Telemetry</span>
            <p className="text-[11px] text-darkSlate-500">
              No tracking scripts, third-party analytics, or cloud telemetry beacons exist in the codebase.
            </p>
          </div>

          <div className="p-3.5 bg-background rounded-lg border border-border space-y-1">
            <span className="font-semibold text-darkSlate-900 block">Local SQLite Storage</span>
            <p className="text-[11px] text-darkSlate-500">
              All database records and session histories persist solely on the institution's local machine.
            </p>
          </div>

          <div className="p-3.5 bg-background rounded-lg border border-border space-y-1">
            <span className="font-semibold text-darkSlate-900 block">Raw Media Deletion</span>
            <p className="text-[11px] text-darkSlate-500">
              Raw frames are discarded immediately after frame differencing unless specifically retained.
            </p>
          </div>
        </div>
      </div>

      {/* Retention & Sensor Configuration */}
      {settings && (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6 space-y-5">
          <h3 className="text-base font-semibold text-darkSlate-900">
            Media Retention & Sensor Controls
          </h3>

          <div className="space-y-4 text-xs divide-y divide-border">
            {/* Auto Delete Toggle */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="font-semibold text-darkSlate-900 block text-sm">
                  Automatic Media Deletion
                </span>
                <span className="text-darkSlate-500 text-xs">
                  Automatically erase uploaded video clips and scratch buffers after session finalization.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_delete_recordings}
                onChange={(e) =>
                  setSettings({ ...settings, auto_delete_recordings: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded"
              />
            </div>

            {/* Retention Hours */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <span className="font-semibold text-darkSlate-900 block text-sm">
                  Media Retention Window (Hours)
                </span>
                <span className="text-darkSlate-500 text-xs">
                  Maximum hours any temporary media file is retained before scheduled deletion.
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="720"
                value={settings.media_retention_hours}
                onChange={(e) =>
                  setSettings({ ...settings, media_retention_hours: Number(e.target.value) })
                }
                className="w-24 bg-background border border-border rounded-md px-3 py-1.5 text-xs text-darkSlate-900 text-right focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Face & Pose Detection Toggle */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <span className="font-semibold text-darkSlate-900 block text-sm">
                  Allow Person & Face Detection
                </span>
                <span className="text-darkSlate-500 text-xs">
                  Enables OpenCV HOG and cascade detection for anonymous tracking.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_face_detection}
                onChange={(e) =>
                  setSettings({ ...settings, allow_face_detection: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded"
              />
            </div>

            {/* Audio Vocal Analysis Toggle */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <span className="font-semibold text-darkSlate-900 block text-sm">
                  Allow Audio Vocal Activity Analysis
                </span>
                <span className="text-darkSlate-500 text-xs">
                  Enables microphone RMS energy and voice-activity ratio calculation.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_audio_analysis}
                onChange={(e) =>
                  setSettings({ ...settings, allow_audio_analysis: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded"
              />
            </div>

            {/* Consent Enforcement */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <span className="font-semibold text-darkSlate-900 block text-sm">
                  Strict Consent Enforcement
                </span>
                <span className="text-darkSlate-500 text-xs">
                  Students who have not granted identity matching consent will remain anonymous tracks.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.consent_enforced}
                onChange={(e) =>
                  setSettings({ ...settings, consent_enforced: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Session Data Purge / Anonymization Card */}
      <div className="bg-surface rounded-xl border border-rose-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center space-x-3 text-rose-700">
          <Trash2 className="w-5 h-5 flex-shrink-0" />
          <div>
            <h3 className="text-base font-semibold">Purge Session Media & Anonymize Records</h3>
            <p className="text-xs text-darkSlate-500">
              Permanently delete all media files and strip student identifiers from attendance for a session.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <select
            value={selectedSessionToPurge}
            onChange={(e) => setSelectedSessionToPurge(e.target.value)}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-darkSlate-900"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.status})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowPurgeModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            Purge Session Media
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-semibold text-darkSlate-900">
                Confirm Permanent Purge
              </h3>
            </div>
            <p className="text-xs text-darkSlate-600 leading-relaxed">
              This action will permanently delete any uploaded video files on the local filesystem and anonymize the attendance records for the selected session. This cannot be undone.
            </p>
            <div className="flex justify-end space-x-2 pt-2 text-xs">
              <button
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 font-medium text-darkSlate-700 hover:bg-slate-100 rounded-md border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handlePurgeSessionData}
                className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-sm"
              >
                Confirm Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
