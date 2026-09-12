'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Upload, FileText, CheckCircle2, Award, Plus, MessageSquare } from 'lucide-react';

interface UserSession {
  id: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  email: string;
  first_name: string;
  last_name: string;
  department: string;
}

export default function AssignmentsClient({ user }: { user: UserSession }) {
  const [data, setData] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Student Submission Modal
  const [submitModalAssignment, setSubmitModalAssignment] = useState<any | null>(null);
  const [fileUrl, setFileUrl] = useState('');

  // Faculty Grading Modal
  const [gradeModalSubmission, setGradeModalSubmission] = useState<any | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  // Faculty Assignment Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCourseId, setCreateCourseId] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createInstructions, setCreateInstructions] = useState('');
  const [createMaxScore, setCreateMaxScore] = useState(100);
  const [createDueDate, setCreateDueDate] = useState('');

  useEffect(() => {
    fetchAssignments();
    fetchCourses();
  }, []);

  async function fetchAssignments() {
    setLoading(true);
    try {
      const res = await fetch('/api/assignments');
      const json = await res.json();
      if (json.success) setData(json.data || []);
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
        if (json.data.courses.length > 0) setCreateCourseId(json.data.courses[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModalAssignment) return;

    try {
      const res = await fetch('/api/assignments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: submitModalAssignment.id,
          fileUrl,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitModalAssignment(null);
        setFileUrl('');
        fetchAssignments();
      } else {
        alert(json.error?.message || 'Submission failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeModalSubmission) return;

    try {
      const res = await fetch('/api/assignments/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: gradeModalSubmission.id,
          score: Number(score),
          feedback,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setGradeModalSubmission(null);
        fetchAssignments();
      } else {
        alert(json.error?.message || 'Grading failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: createCourseId,
          title: createTitle,
          instructions: createInstructions,
          maxScore: Number(createMaxScore),
          dueDate: new Date(createDueDate).toISOString(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setCreateTitle('');
        setCreateInstructions('');
        fetchAssignments();
      } else {
        alert(json.error?.message || 'Failed to create assignment');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-400" /> Assignments & Grading Console
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {user.role === 'STUDENT'
              ? 'Submit your homework and review instructor feedback.'
              : 'Review, evaluate, and grade student submissions.'}
          </p>
        </div>

        {user.role !== 'STUDENT' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Create Assignment
          </button>
        )}
      </div>

      {loading ? (
        <div className="glass-card p-8 text-center text-slate-400 text-sm">Loading assignments...</div>
      ) : user.role === 'STUDENT' ? (
        /* STUDENT VIEW: Assignment listing & Submission buttons */
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-400 text-sm">No pending assignments!</div>
          ) : (
            data.map((item) => {
              const sub = item.submissions?.[0];
              return (
                <div key={item.id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                        {item.course.course_code}
                      </span>
                      <h3 className="font-bold text-slate-100 text-lg">{item.title}</h3>
                    </div>
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      {item.instructions}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <span>Max Score: {item.max_score} pts</span>
                      <span>Due: {new Date(item.due_date).toLocaleString()}</span>
                    </div>

                    {/* Feedback if Graded */}
                    {sub?.status === 'GRADED' && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 mt-2 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                          <Award className="w-4 h-4" /> Grade Result: {sub.score} / {item.max_score} pts
                        </div>
                        {sub.feedback && <p className="italic text-slate-300">"{sub.feedback}"</p>}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase ${
                        sub?.status === 'GRADED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : sub?.status === 'SUBMITTED'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {sub?.status || 'PENDING'}
                    </span>

                    <button
                      onClick={() => {
                        setSubmitModalAssignment(item);
                        setFileUrl(sub?.file_url || '');
                      }}
                      className="btn-primary text-xs flex items-center gap-1.5 mt-2"
                    >
                      <Upload className="w-4 h-4" />
                      {sub ? 'Update Submission' : 'Submit Solution'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* FACULTY / ADMIN VIEW: Submissions grading console */
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-400 text-sm">No submissions pending review.</div>
          ) : (
            data.map((sub) => (
              <div key={sub.id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {sub.assignment.course.course_code}
                    </span>
                    <h3 className="font-bold text-slate-100 text-base">{sub.assignment.title}</h3>
                  </div>
                  <div className="text-sm font-semibold text-slate-300">
                    Student: {sub.student.first_name} {sub.student.last_name} ({sub.student.email})
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                    <span>Submitted: {new Date(sub.submitted_at).toLocaleString()}</span>
                    <a
                      href={sub.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      <FileText className="w-3.5 h-3.5" /> {sub.file_url}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {sub.status === 'GRADED' && (
                    <div className="text-right text-xs">
                      <span className="font-bold text-emerald-400 block">{sub.score} / {sub.assignment.max_score} pts</span>
                      <span className="text-slate-400 italic font-medium max-w-xs truncate block">{sub.feedback}</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setGradeModalSubmission(sub);
                      setScore(sub.score || 0);
                      setFeedback(sub.feedback || '');
                    }}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4" /> {sub.status === 'GRADED' ? 'Edit Grade' : 'Grade Submission'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Student Submit Modal */}
      {submitModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Submit Assignment</h3>
            <p className="text-xs text-slate-400">{submitModalAssignment.title}</p>
            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Submission Link / Github URL / Document URL
                </label>
                <input
                  type="url"
                  required
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://github.com/user/project-repo"
                  className="glass-input w-full text-sm font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitModalAssignment(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Submit Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Faculty Grade Modal */}
      {gradeModalSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Grade Student Submission</h3>
            <div className="text-xs text-slate-300">
              Student: {gradeModalSubmission.student.first_name} {gradeModalSubmission.student.last_name}
            </div>
            <form onSubmit={handleGradeSubmission} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Score (Out of {gradeModalSubmission.assignment.max_score})
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max={gradeModalSubmission.assignment.max_score}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="glass-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Feedback Comments</label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Great work! Excellent code structure."
                  className="glass-input w-full text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGradeModalSubmission(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Faculty Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Create New Assignment</h3>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Course</label>
                <select
                  value={createCourseId}
                  onChange={(e) => setCreateCourseId(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="e.g. Lab 4: Microservices Architecture"
                  className="glass-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={createInstructions}
                  onChange={(e) => setCreateInstructions(e.target.value)}
                  placeholder="Detailed instructions for student..."
                  className="glass-input w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Max Score</label>
                  <input
                    type="number"
                    required
                    value={createMaxScore}
                    onChange={(e) => setCreateMaxScore(Number(e.target.value))}
                    className="glass-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    className="glass-input w-full text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
