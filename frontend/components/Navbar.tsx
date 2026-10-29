"use client";

import React, { useEffect, useState } from "react";
import { 
  ShieldCheck, 
  Cpu, 
  Bell, 
  User as UserIcon, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from "lucide-react";
import { api, HealthResponse, Course } from "@/lib/api";

interface NavbarProps {
  selectedCourseId?: string;
  onSelectCourse?: (courseId: string) => void;
}

export function Navbar({ selectedCourseId, onSelectCourse }: NavbarProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const h = await api.getHealth();
        setHealth(h);
        setIsConnected(true);
      } catch (err) {
        setIsConnected(false);
      }

      try {
        const c = await api.getCourses();
        setCourses(c);
      } catch (err) {
        // quiet fail
      }
    }
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-darkSlate-900 leading-tight">
            Multimodal Attendance & Engagement Agent
          </h1>
          <p className="text-xs text-darkSlate-500">
            Privacy-Preserving Classroom Intelligence
          </p>
        </div>
      </div>

      {/* Middle: Course Selector & System Status */}
      <div className="hidden md:flex items-center space-x-4">
        {courses.length > 0 && onSelectCourse && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-darkSlate-500 font-medium">Classroom:</span>
            <select
              value={selectedCourseId || ""}
              onChange={(e) => onSelectCourse(e.target.value)}
              className="bg-background border border-border rounded-md px-3 py-1.5 text-xs text-darkSlate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code}: {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Local Processing Badge */}
        {isConnected ? (
          <>
            <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Local Processing</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-full text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>100% Offline Ready</span>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-1.5 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-medium animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Backend Offline &bull; Run 'npm run backend'</span>
          </div>
        )}
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center space-x-3">
        <button 
          title="Notifications"
          className="p-2 text-darkSlate-500 hover:text-darkSlate-800 hover:bg-slate-100 rounded-md transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        </button>

        <div className="h-6 w-px bg-border"></div>

        <div className="flex items-center space-x-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center border border-border">
            EV
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-medium text-darkSlate-900">Dr. Elena Vance</p>
            <p className="text-[10px] text-darkSlate-500">Lead Instructor</p>
          </div>
        </div>
      </div>
    </header>
  );
}

