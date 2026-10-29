"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  UserCheck,
  TrendingUp,
  History,
  Lightbulb,
  Users,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Live Session", href: "/live", icon: Video },
  { label: "Attendance", href: "/attendance", icon: UserCheck },
  { label: "Engagement Analytics", href: "/analytics", icon: TrendingUp },
  { label: "Session History", href: "/history", icon: History },
  { label: "AI Teaching Assistant", href: "/assistant", icon: Lightbulb },
  { label: "Students", href: "/students", icon: Users },
  { label: "Reports", href: "/reports", icon: FileSpreadsheet },
  { label: "Privacy & Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "bg-surface border-r border-border transition-all duration-200 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 z-20",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-3">
        {/* Toggle Collapse Button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-darkSlate-400 hover:text-darkSlate-700 hover:bg-slate-100 rounded-md transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  isActive
                    ? "bg-emerald-50 text-emerald-800 font-semibold"
                    : "text-darkSlate-600 hover:text-darkSlate-900 hover:bg-slate-50"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors",
                    isActive ? "text-emerald-600" : "text-darkSlate-400 group-hover:text-darkSlate-600"
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Ethical & Privacy Banner */}
      {!collapsed && (
        <div className="p-4 m-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-darkSlate-600 space-y-1.5">
          <div className="flex items-center space-x-1.5 text-slate-800 font-semibold">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>Ethical AI Guardrail</span>
          </div>
          <p className="text-[11px] leading-relaxed text-darkSlate-500">
            Indicators are proxies, not proof of cognitive attention. No emotion or demographic profiling.
          </p>
        </div>
      )}
    </aside>
  );
}

