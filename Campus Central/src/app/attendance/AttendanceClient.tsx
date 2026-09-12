'use client';

import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  ShieldCheck,
  History,
  ChevronRight,
  ArrowLeft,
  Edit3,
} from 'lucide-react';

interface UserSession {
  id: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  email: string;
  first_name: string;
  last_name: string;
  department: string;
}

interface AttendanceStats {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  sessionsHeld: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  canMiss: number;
  mustAttend: number;
  isAtRisk: boolean;
}

interface PastSession {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  course: { course_code: string; title: string };
  _count: { records: number };
}

interface RosterEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string | null;
}

export default function AttendanceClient({ user }: { user: UserSession }) {
  const [stats, setStats] = useState<AttendanceStats[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [studentRecords, setStudentRecords] = useState<{ studentId: string; name: string; status: string }[]>([]);

  const [selectedPastCourseId, setSelectedPastCourseId] = useState('');
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [pastSessionsLoading, setPastSessionsLoading] = useState(false);

  const [editSession, setEditSession] = useState<{ session: any; roster: RosterEntry[] } | null>(null);
  const [editRoster, setEditRoster] = useState<RosterEntry[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-load past sessions when a course is selected in the Faculty panel
  useEffect(() => {
    if (selectedPastCourseId) fetchPastSessions(selectedPastCourseId);
    else setPastSessions([]);
  }, [selectedPastCourseId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [attRes, courseRes] = await Promise.all([
        fetch('/api/attendance').then((r) => r.json()),
        fetch('/api/academics/courses').then((r) => r.json()),
      ]);

      if (attRes.success) setStats(attRes.data || []);
      if (courseRes.success) {
        const courseList = courseRes.data?.courses || [];
        setCourses(courseList);
        if (courseList.length > 0) setSelectedPastCourseId(courseList[0].id);

        if (courseRes.data?.users) {
          const students = courseRes.data.users.filter((u: any) => u.role === 'STUDENT');
          setStudentRecords(
            students.map((s: any) => ({
              studentId: s.id,
              name: `${s.first_name} ${s.last_name}`,
              status: 'PRESENT',
            }))
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPastSessions(courseId: string) {
    setPastSessionsLoading(true);
    try {
      const res = await fetch(`/api/attendance/sessions?courseId=${courseId}`);
      const data = await res.json();
      if (data.success) setPastSessions(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPastSessionsLoading(false);
    }
  }

  async function openEditSession(sessionId: string) {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/attendance/session/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setEditSession(data.data);
        setEditRoster(
          data.data.roster.map((r: RosterEntry) => ({
            ...r,
            status: r.status ?? 'PRESENT',
          }))
        );
      } else {
        alert(data.error?.message || 'Failed to load session');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSaveEdit() {
    if (!editSession) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/attendance/session/${editSession.session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: editRoster.map((r) => ({ studentId: r.studentId, status: r.status })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditSession(null);
        setEditRoster([]);
        fetchData();
        if (selectedPastCourseId) fetchPastSessions(selectedPastCourseId);
      } else {
        alert(data.error?.message || 'Failed to save changes');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    try {
      const res = await fetch('/api/attendance/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          sessionDate: new Date(sessionDate).toISOString(),
          startTime,
          endTime,
          records: studentRecords.map((r) => ({
            studentId: r.studentId,
            status: r.status,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowSessionModal(false);
        fetchData();
        if (selectedPastCourseId) fetchPastSessions(selectedPastCourseId);
      } else {
        alert(data.error?.message || 'Failed to log session');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateStudentStatus = (studentId: string, newStatus: string) => {
    setStudentRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status: newStatus } : r))
    );
  };

  const updateEditRosterStatus = (studentId: string, newStatus: string) => {
    setEditRoster((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status: newStatus } : r))
    );
  };

  const statusColor: Record<string, string> = {
    PRESENT: 'text-emerald-400',
    ABSENT: 'text-rose-400',
    LATE: 'text-amber-400',
    EXCUSED: 'text-blue-400',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
            <CalendarCheck className="w-8 h-8 text-emerald-400" /> Attendance &amp; Buffer Calculator
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time tracking with proactive calculation for the 75% eligibility threshold.
          </p>
        </div>

        {user.role !== 'STUDENT' && (
          <button
            onClick={() => {
              if (courses.length > 0) setSelectedCourseId(courses[0].id);
              setShowSessionModal(true);
            }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Log Class Session
          </button>
        )}
      </div>

      {/* Attendance Cards List */}
      {loading ? (
        <div className="glass-card p-8 text-center text-slate-400 text-sm">Loading attendance records...</div>
      ) : stats.length === 0 ? (
        <div className="glass-card p-8 text-center text-slate-400 text-sm">
          No course attendance records found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((item) => (
            <div key={item.courseId} className="glass-card p-6 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      {item.courseCode}
                    </span>
                    <h3 className="font-bold text-slate-100 text-lg">{item.courseTitle}</h3>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                      item.percentage >= 75
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {item.percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 h-2.5 rounded-full mt-4 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all ${
                      item.percentage >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Held</span>
                    <span className="text-sm font-bold text-slate-200">{item.sessionsHeld}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Present</span>
                    <span className="text-sm font-bold text-emerald-400">{item.present}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Absent</span>
                    <span className="text-sm font-bold text-rose-400">{item.absent}</span>
                  </div>
                </div>
              </div>

              {/* Buffer Calculator Engine Display */}
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  item.isAtRisk
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                }`}
              >
                {item.isAtRisk ? (
                  <>
                    <div className="flex items-center gap-1.5 font-bold text-rose-400">
                      <AlertTriangle className="w-4 h-4" /> Below 75% Threshold!
                    </div>
                    <p>
                      You cannot afford to miss any classes. You must attend the next{' '}
                      <span className="font-extrabold text-rose-300 text-sm">{item.mustAttend}</span> consecutive
                      class(es) to recover to 75%.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <ShieldCheck className="w-4 h-4" /> Good Standing
                    </div>
                    <p>
                      You can afford to miss{' '}
                      <span className="font-extrabold text-emerald-300 text-sm">{item.canMiss}</span> upcoming class(es)
                      without dropping below 75%.
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {user.role !== 'STUDENT' && courses.length > 0 && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">Past Sessions</h2>
          </div>

          {/* Course picker */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">Select Course:</label>
            <select
              value={selectedPastCourseId}
              onChange={(e) => setSelectedPastCourseId(e.target.value)}
              className="glass-input text-sm bg-slate-900 flex-1"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {pastSessionsLoading ? (
            <p className="text-slate-500 text-sm">Loading sessions…</p>
          ) : pastSessions.length === 0 ? (
            <p className="text-slate-500 text-sm">No past sessions recorded for this course.</p>
          ) : (
            <div className="space-y-2">
              {pastSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openEditSession(s.id)}
                  disabled={editLoading}
                  className="w-full flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-left transition-all group"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-200">
                      {new Date(s.session_date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {s.start_time} – {s.end_time} &nbsp;·&nbsp;
                      <span className="text-indigo-400">{s._count.records} record(s)</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 group-hover:text-indigo-400 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-100">Log Attendance Session</h3>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Select Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="glass-input w-full text-sm bg-slate-900"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Session Date</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="glass-input w-full text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="glass-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="glass-input w-full text-sm"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Student Roster</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {studentRecords.map((st) => (
                    <div
                      key={st.studentId}
                      className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-200">{st.name}</span>
                      <select
                        value={st.status}
                        onChange={(e) => updateStudentStatus(st.studentId, e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1 text-slate-200"
                      >
                        <option value="PRESENT">PRESENT</option>
                        <option value="ABSENT">ABSENT</option>
                        <option value="LATE">LATE</option>
                        <option value="EXCUSED">EXCUSED</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setEditSession(null); setEditRoster([]); }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Edit Attendance Session</h3>
                <p className="text-xs text-slate-400">
                  {editSession.session.course.course_code} —{' '}
                  {new Date(editSession.session.session_date).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  &nbsp;·&nbsp;{editSession.session.start_time}–{editSession.session.end_time}
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {editRoster.map((r) => (
                <div
                  key={r.studentId}
                  className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-200">
                      {r.firstName} {r.lastName}
                    </span>
                    <span className="text-slate-500 ml-2">{r.email}</span>
                  </div>
                  <select
                    value={r.status ?? 'PRESENT'}
                    onChange={(e) => updateEditRosterStatus(r.studentId, e.target.value)}
                    className={`bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1 ${
                      statusColor[r.status ?? 'PRESENT'] || 'text-slate-200'
                    }`}
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="ABSENT">ABSENT</option>
                    <option value="LATE">LATE</option>
                    <option value="EXCUSED">EXCUSED</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => { setEditSession(null); setEditRoster([]); }}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="btn-primary text-xs"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
