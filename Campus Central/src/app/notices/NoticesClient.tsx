'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Pin, Filter, Plus, User, Building, BookOpen } from 'lucide-react';

interface UserSession {
  id: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  email: string;
  first_name: string;
  last_name: string;
  department: string;
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

export default function NoticesClient({ user }: { user: UserSession }) {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'EVERYTHING' | 'ALL' | 'DEPARTMENT' | 'COURSE'>('EVERYTHING');

  // Modal Composer State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetScope, setTargetScope] = useState<'ALL' | 'COURSE' | 'DEPARTMENT'>('ALL');
  const [courseId, setCourseId] = useState('');
  const [department, setDepartment] = useState(user.department);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    fetchNotices();
    fetchCourses();
  }, []);

  async function fetchNotices() {
    setLoading(true);
    try {
      const res = await fetch('/api/notices');
      const json = await res.json();
      if (json.success) setNotices(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCourses() {
    try {
      const res = await fetch('/api/academics/courses');
      const json = await res.json();
      if (json.success && json.data?.courses) {
        setCourses(json.data.courses);
        if (json.data.courses.length > 0) setCourseId(json.data.courses[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          targetScope,
          courseId: targetScope === 'COURSE' ? courseId : undefined,
          department: targetScope === 'DEPARTMENT' ? department : undefined,
          isPinned,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setTitle('');
        setContent('');
        fetchNotices();
      } else {
        alert(json.error?.message || 'Failed to post announcement');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotices = notices.filter((n) => {
    if (selectedFilter === 'EVERYTHING') return true;
    return n.target_scope === selectedFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
            <Bell className="w-8 h-8 text-amber-400" /> Targeted Notice Routing
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Eliminating communication noise with strictly targeted campus announcements.
          </p>
        </div>

        {user.role !== 'STUDENT' && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Compose Announcement
          </button>
        )}
      </div>

      {/* Scope Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        <button
          onClick={() => setSelectedFilter('EVERYTHING')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            selectedFilter === 'EVERYTHING'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          All Feeds
        </button>
        <button
          onClick={() => setSelectedFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            selectedFilter === 'ALL'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Campus-Wide (ALL)
        </button>
        <button
          onClick={() => setSelectedFilter('DEPARTMENT')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            selectedFilter === 'DEPARTMENT'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Departmental ({user.department})
        </button>
        <button
          onClick={() => setSelectedFilter('COURSE')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            selectedFilter === 'COURSE'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Course Specific
        </button>
      </div>

      {/* Notices Feed */}
      {loading ? (
        <div className="glass-card p-8 text-center text-slate-400 text-sm">Loading announcements...</div>
      ) : filteredNotices.length === 0 ? (
        <div className="glass-card p-8 text-center text-slate-400 text-sm">
          No announcements found for selected feed filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => (
            <div
              key={notice.id}
              className={`glass-card p-6 space-y-3 relative overflow-hidden ${
                notice.is_pinned ? 'border-l-4 border-l-amber-400 bg-slate-900/80' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {notice.is_pinned && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase ${
                        notice.target_scope === 'ALL'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : notice.target_scope === 'DEPARTMENT'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      Scope: {notice.target_scope}
                    </span>

                    {notice.course_name && (
                      <span className="text-xs font-semibold text-slate-400">
                        Course: {notice.course_name}
                      </span>
                    )}

                    {notice.department && (
                      <span className="text-xs font-semibold text-slate-400">
                        Dept: {notice.department}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 mt-2">{notice.title}</h3>
                </div>

                <span className="text-xs text-slate-500 shrink-0">
                  {new Date(notice.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                {notice.content}
              </p>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>
                  Posted by <strong className="text-slate-200">{notice.author_name}</strong> ({notice.author_role})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Compose Targeted Announcement</h3>
            <form onSubmit={handleCreateNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Exam Schedule Update"
                  className="glass-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Target Scope Channel</label>
                <select
                  value={targetScope}
                  onChange={(e) => setTargetScope(e.target.value as any)}
                  className="glass-input w-full text-sm bg-slate-900"
                >
                  <option value="ALL">ALL (Campus-Wide)</option>
                  <option value="DEPARTMENT">DEPARTMENT</option>
                  <option value="COURSE">COURSE</option>
                </select>
              </div>

              {targetScope === 'COURSE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Target Course</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="glass-input w-full text-sm bg-slate-900"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetScope === 'DEPARTMENT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Target Department</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="glass-input w-full text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Content</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write announcement details..."
                  className="glass-input w-full text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinNotice"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="pinNotice" className="text-xs font-semibold text-slate-300">
                  Pin this announcement to top of student feed
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
