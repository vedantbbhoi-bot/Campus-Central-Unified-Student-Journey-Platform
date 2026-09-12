'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Users,
  Shield,
  Trash2,
  UserPlus,
  X,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Layers,
  Search,
  ExternalLink,
} from 'lucide-react';

interface UserSession {
  id: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  email: string;
  first_name: string;
  last_name: string;
  department: string;
}

interface CourseItem {
  id: string;
  course_code: string;
  title: string;
  department: string;
  faculty: {
    first_name: string;
    last_name: string;
    email: string;
  };
  _count?: {
    enrollments: number;
  };
}

interface SystemUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string;
}

interface EnrolledStudent {
  id: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    department: string;
  };
}

export default function ManageCoursesClient({ user }: { user: UserSession }) {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Course Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('Computer Science');
  const [newFacultyId, setNewFacultyId] = useState('');
  const [creating, setCreating] = useState(false);

  // Roster Management State
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [roster, setRoster] = useState<EnrolledStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  // Feedback notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/academics/courses').then((r) => r.json());
      if (res.success) {
        setCourses(res.data.courses || []);
        setUsers(res.data.users || []);
        const firstFaculty = (res.data.users || []).find((u: SystemUser) => u.role === 'FACULTY');
        if (firstFaculty && !newFacultyId) {
          setNewFacultyId(firstFaculty.id);
        }
      }
    } catch (err) {
      showToast('Failed to load courses data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim() || !newTitle.trim() || !newFacultyId) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/academics/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: newCode.trim(),
          title: newTitle.trim(),
          department: newDept.trim(),
          facultyId: newFacultyId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Course ${data.data.course_code} created successfully!`);
        setShowCreateModal(false);
        setNewCode('');
        setNewTitle('');
        await loadData();
      } else {
        showToast(data.error?.message || 'Failed to create course', 'error');
      }
    } catch (err) {
      showToast('Network error while creating course', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function openRoster(course: CourseItem) {
    setSelectedCourse(course);
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/academics/courses/${course.id}/enrollments`).then((r) => r.json());
      if (res.success) {
        setRoster(res.data || []);
      } else {
        showToast(res.error?.message || 'Failed to load roster', 'error');
      }
    } catch (err) {
      showToast('Network error fetching course roster', 'error');
    } finally {
      setRosterLoading(false);
    }
  }

  async function handleEnrollStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourse || !selectedStudentToEnroll) return;

    setEnrolling(true);
    try {
      const res = await fetch(`/api/academics/courses/${selectedCourse.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: [selectedStudentToEnroll] }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Student enrolled successfully');
        setSelectedStudentToEnroll('');
        await openRoster(selectedCourse);
        await loadData();
      } else {
        showToast(data.error?.message || 'Failed to enroll student', 'error');
      }
    } catch (err) {
      showToast('Error enrolling student', 'error');
    } finally {
      setEnrolling(false);
    }
  }

  async function handleUnenrollStudent(studentId: string) {
    if (!selectedCourse) return;
    if (!confirm('Are you sure you want to remove this student from the course?')) return;

    try {
      const res = await fetch(
        `/api/academics/courses/${selectedCourse.id}/enrollments/${studentId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        showToast('Student removed from course');
        await openRoster(selectedCourse);
        await loadData();
      } else {
        showToast(data.error?.message || 'Failed to unenroll student', 'error');
      }
    } catch (err) {
      showToast('Error removing student', 'error');
    }
  }

  const facultyUsers = users.filter((u) => u.role === 'FACULTY');
  const allStudents = users.filter((u) => u.role === 'STUDENT');
  const enrolledStudentIds = new Set(roster.map((r) => r.student.id));
  const availableStudentsToEnroll = allStudents.filter((s) => !enrolledStudentIds.has(s.id));

  const filteredCourses = courses.filter((c) =>
    c.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/40'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
            <Shield className="w-3.5 h-3.5" /> Admin Registrar Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Course & Roster Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create academic courses, assign faculty instructors, and manage student enrollments.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Course
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by code, title, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input pl-10 w-full text-sm"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Total Courses: <span className="text-slate-200 font-bold">{courses.length}</span>
        </div>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 animate-pulse">Loading academic courses...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-200">No Courses Found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? 'No courses match your search criteria. Try a different query.'
              : 'There are no active courses in the system. Click "Create Course" to add the first one.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="glass-card p-6 flex flex-col justify-between hover:border-blue-500/40 transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {course.course_code}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                    {course.department}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                    {course.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-amber-400" /> Instructor:
                    </span>
                    <span className="font-medium text-slate-200">
                      {course.faculty ? `${course.faculty.first_name} ${course.faculty.last_name}` : 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-400" /> Enrolled Students:
                    </span>
                    <span className="font-bold text-slate-200">
                      {course._count?.enrollments ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-800/60">
                <button
                  onClick={() => openRoster(course)}
                  className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-2 hover:border-blue-500/40 hover:text-blue-300"
                >
                  <Users className="w-3.5 h-3.5" />
                  Manage Roster ({course._count?.enrollments ?? 0})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE COURSE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-6 border-slate-700 bg-slate-900/95 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" /> Create Academic Course
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Course Code <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS-301"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="glass-input w-full text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Course Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Computing & Microservices"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="glass-input w-full text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Department <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="glass-input w-full text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Assigned Faculty Instructor <span className="text-rose-400">*</span>
                </label>
                <select
                  value={newFacultyId}
                  onChange={(e) => setNewFacultyId(e.target.value)}
                  className="glass-input w-full text-sm bg-slate-950 text-slate-100"
                  required
                >
                  <option value="">Select Faculty Member</option>
                  {facultyUsers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.first_name} {f.last_name} ({f.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {creating ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROSTER MANAGEMENT MODAL */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-2xl w-full p-6 border-slate-700 bg-slate-900/95 space-y-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-bold font-mono rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {selectedCourse.course_code}
                  </span>
                  <h2 className="text-lg font-bold text-slate-100">{selectedCourse.title}</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Instructor: {selectedCourse.faculty.first_name} {selectedCourse.faculty.last_name} •{' '}
                  {roster.length} Enrolled Student(s)
                </p>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Enroll New Student Form */}
            <form onSubmit={handleEnrollStudent} className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedStudentToEnroll}
                onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                className="glass-input flex-1 text-sm bg-slate-950 text-slate-100"
                disabled={enrolling || availableStudentsToEnroll.length === 0}
              >
                <option value="">
                  {availableStudentsToEnroll.length === 0
                    ? 'All students are already enrolled'
                    : 'Select a student to enroll...'}
                </option>
                {availableStudentsToEnroll.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} — {s.email} ({s.department})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!selectedStudentToEnroll || enrolling}
                className="btn-primary text-xs flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                {enrolling ? 'Enrolling...' : 'Enroll Student'}
              </button>
            </form>

            {/* Roster Table */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {rosterLoading ? (
                <div className="text-center py-12 text-slate-400 animate-pulse">Loading enrolled students...</div>
              ) : roster.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm">No students currently enrolled in this course.</p>
                  <p className="text-xs text-slate-600 mt-0.5">Use the dropdown above to add students.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {roster.map(({ student }) => (
                    <div
                      key={student.id}
                      className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-700 transition-all"
                    >
                      <div>
                        <div className="font-semibold text-sm text-slate-200">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {student.email} • <span className="text-slate-500">{student.department}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnenrollStudent(student.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove student from course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedCourse(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
