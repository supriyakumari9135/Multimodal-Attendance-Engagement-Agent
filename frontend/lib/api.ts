// Centralized API Client for Multimodal Attendance & Engagement Agent

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface CapabilityStatus {
  name: str;
  available: boolean;
  status_detail: string;
  is_offline_ready: boolean;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  offline_mode: boolean;
  capabilities: CapabilityStatus[];
}

export interface Course {
  id: string;
  course_code: string;
  name: string;
  teacher_id: string;
  created_at: string;
  enrolled_count: number;
  sessions_count: number;
}

export interface Student {
  id: string;
  student_code: string;
  display_name: string;
  reference_image_path?: string | null;
  created_at: string;
  updated_at: string;
  courses: string[];
  consents: Record<string, boolean>;
}

export interface SessionItem {
  id: string;
  course_id: string;
  title: string;
  start_time: string;
  end_time?: string | null;
  status: string; // Draft, Ready, Running, Paused, Processing, Completed, Failed
  input_mode: string;
  configuration_json: Record<string, any>;
  course_name?: string | null;
  course_code?: string | null;
  attendance_rate?: number;
  engagement_average?: number;
  total_records?: number;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id?: string | null;
  student_name?: string | null;
  student_code?: string | null;
  anonymous_track_id?: string | null;
  first_seen?: string | null;
  last_seen?: string | null;
  observed_duration: number;
  status: string;
  source: string;
  manually_corrected: boolean;
  confidence: number;
}

export interface Recommendation {
  id: string;
  session_id: string;
  title: string;
  explanation: string;
  evidence_json: Record<string, any>;
  suggested_action: string;
  confidence: number;
  status: string;
  created_at: string;
}

export interface OverviewStats {
  total_enrolled_students: number;
  active_courses_count: number;
  total_sessions_count: number;
  selected_session_present: number;
  selected_session_attendance_pct: number;
  current_session_duration_minutes: number;
  average_engagement_score: number;
  recent_participation_activity: number;
  teaching_recommendation_count: number;
  is_demo_mode: boolean;
}

export interface SessionAnalytics {
  session_id: string;
  session_title: string;
  start_time: string;
  end_time?: string | null;
  duration_minutes: number;
  explainable_engagement_score: number;
  weights_applied: Record<string, number>;
  available_modalities: string[];
  timeline_points: Array<{
    interval_label: string;
    time: string;
    participation_activity?: number | null;
    movement_patterns?: number | null;
    head_orientation?: number | null;
    audio_activity?: number | null;
    explainable_score?: number | null;
  }>;
  attendance_summary: Record<string, number>;
  insights: Array<{
    interval: string;
    metric: string;
    change: number;
    wording: string;
    evidence: Record<string, any>;
    confidence: number;
    limitation: string;
  }>;
}

export interface PrivacySettings {
  media_retention_hours: number;
  auto_delete_recordings: boolean;
  allow_face_detection: boolean;
  allow_audio_analysis: boolean;
  consent_enforced: boolean;
  anonymous_tracks_only: boolean;
  updated_at: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      let errorMsg = `Server error: ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) errorMsg = errorJson.detail;
      } catch {
        // use default
      }
      throw new Error(errorMsg);
    }

    return await res.json();
  } catch (err: any) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error("Unable to connect to the offline local server (http://localhost:8000). Please ensure the backend is running.");
    }
    throw err;
  }
}

export const api = {
  // Health
  getHealth: () => request<HealthResponse>("/health"),
  getCapabilities: () => request<CapabilityStatus[]>("/health/capabilities"),

  // Demo actions
  seedDemo: () => request<{ status: string; message: string }>("/demo/seed", { method: "POST" }),
  resetDemo: () => request<{ status: string; message: string }>("/demo/reset", { method: "POST" }),

  // Overview
  getOverviewStats: (courseId?: string, sessionId?: string) => {
    const params = new URLSearchParams();
    if (courseId) params.append("course_id", courseId);
    if (sessionId) params.append("session_id", sessionId);
    return request<OverviewStats>(`/analytics/overview?${params.toString()}`);
  },

  // Courses
  getCourses: () => request<Course[]>("/courses"),
  createCourse: (data: { course_code: string; name: string }) =>
    request<Course>("/courses", { method: "POST", body: JSON.stringify(data) }),
  deleteCourse: (id: string) => request<{ message: string }>(`/courses/${id}`, { method: "DELETE" }),

  // Students
  getStudents: (search?: string, courseId?: string) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (courseId) params.append("course_id", courseId);
    return request<Student[]>(`/students?${params.toString()}`);
  },
  createStudent: (data: { student_code: string; display_name: string; course_ids?: string[] }) =>
    request<Student>("/students", { method: "POST", body: JSON.stringify(data) }),
  getStudentAttendanceHistory: (studentId: string) =>
    request<any>(`/students/${studentId}/attendance-history`),
  importStudentsCsv: async (file: File, courseId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (courseId) formData.append("course_id", courseId);
    const res = await fetch(`${API_BASE_URL}/students/import`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "CSV Import failed" }));
      throw new Error(err.detail || "CSV Import failed");
    }
    return res.json();
  },

  // Sessions
  getSessions: (courseId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (courseId) params.append("course_id", courseId);
    if (status) params.append("status", status);
    return request<SessionItem[]>(`/sessions?${params.toString()}`);
  },
  getSession: (id: string) => request<SessionItem>(`/sessions/${id}`),
  createSession: (data: { course_id: string; title: string; input_mode: string; planned_duration_minutes?: number; configuration_json?: any }) =>
    request<SessionItem>("/sessions", { method: "POST", body: JSON.stringify(data) }),
  startSession: (id: string) => request<{ status: string }>(`/sessions/${id}/start`, { method: "POST" }),
  pauseSession: (id: string) => request<{ status: string }>(`/sessions/${id}/pause`, { method: "POST" }),
  resumeSession: (id: string) => request<{ status: string }>(`/sessions/${id}/resume`, { method: "POST" }),
  stopSession: (id: string) => request<{ status: string }>(`/sessions/${id}/stop`, { method: "POST" }),
  finalizeSession: (id: string) => request<{ status: string }>(`/sessions/${id}/finalize`, { method: "POST" }),

  // Processing & Live Stream
  getProcessingStatus: (sessionId: string) =>
    request<any>(`/sessions/${sessionId}/processing-status`),
  uploadSessionVideo: async (sessionId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/upload`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Video upload failed" }));
      throw new Error(err.detail || "Video upload failed");
    }
    return res.json();
  },

  // Attendance
  getSessionAttendance: (sessionId: string) =>
    request<AttendanceRecord[]>(`/sessions/${sessionId}/attendance`),
  correctAttendance: (sessionId: string, recordId: string, payload: { status: string; student_id?: string; notes?: string }) =>
    request<{ message: string }>(`/sessions/${sessionId}/attendance/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),

  // Analytics & Recommendations
  getSessionAnalytics: (sessionId: string) =>
    request<SessionAnalytics>(`/analytics/sessions/${sessionId}`),
  getSessionRecommendations: (sessionId: string) =>
    request<Recommendation[]>(`/sessions/${sessionId}/recommendations`),
  updateRecommendationStatus: (id: string, status: string) =>
    request<{ message: string }>(`/recommendations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),

  // Reports URL builders
  getCsvReportUrl: (sessionId: string) => `${API_BASE_URL}/reports/sessions/${sessionId}/csv`,
  getPdfReportUrl: (sessionId: string) => `${API_BASE_URL}/reports/sessions/${sessionId}/pdf`,

  // Privacy & Settings
  getPrivacySettings: () => request<PrivacySettings>("/privacy/settings"),
  updatePrivacySettings: (data: Partial<PrivacySettings>) =>
    request<PrivacySettings>("/privacy/settings", { method: "PATCH", body: JSON.stringify(data) }),
  deleteSessionPrivacyData: (sessionId: string) =>
    request<{ message: string }>(`/privacy/delete-session-data?session_id=${sessionId}`, { method: "POST" })
};
