'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  Clock,
  BookOpen,
  Bell,
  AlertTriangle,
  CheckCircle,
  Plus,
  ArrowRight,
  Shield,
  GraduationCap,
  Users,
  Award,
  Pin,
  ExternalLink,
  ChevronRight,
  FileCheck,
} from 'lucide-react';

interface UserSession {
  id: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  email: string;
  first_name: string;
  last_name: string;
  department: string;
}

interface TimelineItem {
  id: string;
  type: 'ASSIGNMENT' | 'DEADLINE' | 'EXAM';
  title: string;
  due_date: string;
  course_name: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: string;
  instructions?: string;
  max_score?: number;
}

interface AttendanceStats {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  sessionsHeld: number;
  present: number;
  absent: number;
  percentage: number;
  canMiss: number;
  mustAttend: number;
  isAtRisk: boolean;
}

interface NoticeItem {
  id: string;
  author_name: string;
  author_role: string;
  title: string;
  content: string;
  target_scope: 'ALL' | 'COURSE' | 'DEPARTMENT';
  course_name?: string;
  department?: string;
  is_pinned: boolean;
  created_at: string;
}

export default function DashboardClient({ user }: { user: UserSession }) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceStats[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [academics, setAcademics] = useState<any>({ courses: [], users: [] });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Modal States
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [newDeadlinePriority, setNewDeadlinePriority] = useState('MEDIUM');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [timelineRes, attendanceRes, noticesRes, academicsRes, assignmentsRes] = await Promise.all([
          fetch('/api/timeline').then((r) => r.json()),
          fetch('/api/attendance').then((r) => r.json()),
          fetch('/api/notices').then((r) => r.json()),
          fetch('/api/academics/courses').then((r) => r.json()),
          fetch('/api/assignments').then((r) => r.json()),
        ]);

        if (timelineRes.success) setTimeline(timelineRes.data || []);
        if (attendanceRes.success) setAttendance(attendanceRes.data || []);
        if (noticesRes.success) setNotices(noticesRes.data || []);
        if (academicsRes.success) setAcademics(academicsRes.data || { courses: [], users: [] });
        if (assignmentsRes.success) setSubmissions(assignmentsRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDeadlineTitle,
          dueDate: new Date(newDeadlineDate).toISOString(),
          priority: newDeadlinePriority,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDeadlineModal(false);
        setNewDeadlineTitle('');
        setNewDeadlineDate('');
        // Refresh timeline
        const tRes = await fetch('/api/timeline').then((r) => r.json());
        if (tRes.success) setTimeline(tRes.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const atRiskCourses = attendance.filter((a) => a.isAtRisk);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-700 text-slate-300">LOW</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="glass-card p-6 md:p-8 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-blue-950/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mb-1">
              <span>Welcome Back</span>
              <span>•</span>
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Hello, {user.first_name} {user.last_name} 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {user.role === 'STUDENT'
                ? `Department of ${user.department} • Track your timeline and attendance thresholds.`
                : user.role === 'FACULTY'
                ? `Faculty in ${user.department} • Manage sessions, grade submissions, and post notices.`
                : `System Administrator • Overview of courses, users, and platform activity.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {user.role === 'STUDENT' && (
              <button
                onClick={() => setShowDeadlineModal(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Add Personal Deadline
              </button>
            )}
            {user.role !== 'STUDENT' && (
              <Link href="/notices" className="btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Post Notice
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* PROACTIVE ATTENDANCE RISK ALERT (For Students) */}
      {user.role === 'STUDENT' && atRiskCourses.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-2 animate-pulse">
          <div className="flex items-center gap-2 font-bold text-base text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <span>Proactive Attendance Alert — Action Required!</span>
          </div>
          <p className="text-xs text-rose-300">
            You are at or below the 75% attendance threshold in {atRiskCourses.length} course(s). You have 0 missable buffer classes left!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {atRiskCourses.map((c) => (
              <div key={c.courseId} className="bg-slate-950/80 p-3 rounded-xl border border-rose-500/40 text-xs">
                <div className="font-bold text-slate-100">{c.courseCode}: {c.courseTitle}</div>
                <div className="text-rose-400 font-semibold mt-1">Current Attendance: {c.percentage}%</div>
                <div className="text-slate-300 mt-1">
                  Must attend next <span className="font-bold text-rose-300">{c.mustAttend}</span> consecutive class(es) to recover.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STUDENT DASHBOARD GRID */}
      {user.role === 'STUDENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column: Unified Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" /> Single Dynamic Timeline
              </h2>
              <span className="text-xs text-slate-400">{timeline.length} Upcoming Events</span>
            </div>

            {loading ? (
              <div className="glass-card p-8 text-center text-slate-400 text-sm">Loading timeline...</div>
            ) : timeline.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-400 text-sm">
                No upcoming assignments or exams. Clear schedule!
              </div>
            ) : (
              <div className="space-y-3">
                {timeline.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="glass-card p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          item.type === 'ASSIGNMENT'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : item.type === 'EXAM'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {item.type.slice(0, 3)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-100 text-sm">{item.title}</h3>
                          {getPriorityBadge(item.priority)}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{item.course_name}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-slate-200">
                        {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <span
                        className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-1 ${
                          item.status === 'GRADED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : item.status === 'SUBMITTED'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {item.status || 'PENDING'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Column: Attendance Overview & Scoped Notices */}
          <div className="space-y-6">
            {/* Attendance Overview Card */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-400" /> Attendance Thresholds
                </h3>
                <Link href="/attendance" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                  Details <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {attendance.map((stat) => (
                  <div key={stat.courseId} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-200">{stat.courseCode}</span>
                      <span className={stat.percentage < 75 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {stat.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stat.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>{stat.sessionsHeld} sessions held</span>
                      <span className={stat.canMiss === 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        Can miss: {stat.canMiss}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scoped Notices */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" /> Campus Announcements
                </h3>
                <Link href="/notices" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                  Feed <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {notices.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No recent announcements.</p>
              ) : (
                <div className="space-y-3">
                  {notices.slice(0, 3).map((notice) => (
                    <div key={notice.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 flex items-center gap-1">
                          {notice.is_pinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                          {notice.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                          {notice.target_scope}
                        </span>
                      </div>
                      <p className="text-slate-400 line-clamp-2">{notice.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FACULTY / ADMIN DASHBOARD GRID */}
      {user.role !== 'STUDENT' && (
        <div className="space-y-8">
          {/* Stat Cards for Admin / Faculty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase">Active Courses</span>
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{academics.courses?.length || 0}</div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase">Pending Submissions</span>
                <FileCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{submissions.length}</div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase">Published Notices</span>
                <Bell className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{notices.length}</div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase">System Users</span>
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{academics.users?.length || 'Active'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Actions & Courses */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" /> Managed Courses
                </h2>
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin/courses"
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline"
                  >
                    Manage Roster & Courses <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
              <div className="space-y-3">
                {academics.courses?.map((course: any) => (
                  <div key={course.id} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-100">{course.course_code} - {course.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Department: {course.department}</div>
                    </div>
                    <Link
                      href="/attendance"
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                    >
                      Log Session
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Submissions Needing Grading */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-amber-400" /> Submissions Console
                </h2>
                <Link href="/assignments" className="text-xs text-blue-400 hover:underline">
                  View All
                </Link>
              </div>

              {submissions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">All submissions are up to date!</p>
              ) : (
                <div className="space-y-3">
                  {submissions.slice(0, 4).map((sub: any) => (
                    <div key={sub.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-200">{sub.student.first_name} {sub.student.last_name}</div>
                        <div className="text-slate-400">{sub.assignment.title} • {sub.assignment.course.course_code}</div>
                      </div>
                      <Link
                        href="/assignments"
                        className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg font-semibold hover:bg-amber-500/20"
                      >
                        Grade
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Personal Deadline Modal */}
      {showDeadlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Add Personal Deadline</h3>
            <form onSubmit={handleAddDeadline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newDeadlineTitle}
                  onChange={(e) => setNewDeadlineTitle(e.target.value)}
                  placeholder="e.g. Study for Midterm"
                  className="glass-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Due Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newDeadlineDate}
                  onChange={(e) => setNewDeadlineDate(e.target.value)}
                  className="glass-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Priority</label>
                <select
                  value={newDeadlinePriority}
                  onChange={(e) => setNewDeadlinePriority(e.target.value)}
                  className="glass-input w-full text-sm bg-slate-900"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeadlineModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Deadline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
