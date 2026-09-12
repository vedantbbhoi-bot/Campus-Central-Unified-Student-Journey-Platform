'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  BookOpen,
  FileCheck,
  AlertTriangle,
  Sparkles,
  MapPin,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Edit2,
  Layers,
  Filter,
  Users,
} from 'lucide-react';
import Link from 'next/link';

interface UserSession {
  id: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  email: string;
  first_name: string;
  last_name: string;
  department: string;
}

interface CalendarItem {
  id: string;
  type: 'CLASS' | 'EXAM' | 'ASSIGNMENT' | 'DEADLINE' | 'EVENT';
  title: string;
  date: string;
  endDate?: string | null;
  startTime?: string;
  endTime?: string;
  courseId?: string | null;
  courseName?: string | null;
  priority?: string;
  status?: string;
  description?: string | null;
  eventType?: string;
  targetScope?: string;
  department?: string | null;
  maxScore?: number;
  isCompleted?: boolean;
  canEdit: boolean;
}

interface CourseOption {
  id: string;
  course_code: string;
  title: string;
  department: string;
}

export default function CalendarClient({ user }: { user: UserSession }) {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Selected date for day view / actions
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showScheduleClassModal, setShowScheduleClassModal] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<CalendarItem | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarItem | null>(null);

  // Add Event Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventType, setEventType] = useState<'HOLIDAY' | 'MEETING' | 'EXTRA_CLASS' | 'CANCELLATION' | 'OTHER'>('OTHER');
  const [eventStartDate, setEventStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventStartTime, setEventStartTime] = useState('10:00');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventEndTime, setEventEndTime] = useState('11:00');
  const [eventScope, setEventScope] = useState<'ALL' | 'COURSE' | 'DEPARTMENT'>('ALL');
  const [eventCourseId, setEventCourseId] = useState('');
  const [submittingEvent, setSubmittingEvent] = useState(false);

  // Schedule Class Form State
  const [classCourseId, setClassCourseId] = useState('');
  const [classDate, setClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [classStartTime, setClassStartTime] = useState('09:00');
  const [classEndTime, setClassEndTime] = useState('10:00');
  const [classRoster, setClassRoster] = useState<{ studentId: string; name: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' }[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [submittingClass, setSubmittingClass] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchCalendarData();
    fetchCourses();
  }, []);

  async function fetchCalendarData() {
    setLoading(true);
    try {
      const res = await fetch('/api/calendar').then((r) => r.json());
      if (res.success) {
        setItems(res.data || []);
      } else {
        showToast(res.error?.message || 'Failed to fetch calendar items', 'error');
      }
    } catch (err) {
      showToast('Error loading calendar data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCourses() {
    try {
      const res = await fetch('/api/academics/courses').then((r) => r.json());
      if (res.success) {
        setCourses(res.data.courses || []);
        if (res.data.courses?.length > 0) {
          setClassCourseId(res.data.courses[0].id);
          setEventCourseId(res.data.courses[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  }

  // When class course changes in Schedule Class modal, fetch roster
  useEffect(() => {
    if (classCourseId && showScheduleClassModal) {
      loadRosterForClass(classCourseId);
    }
  }, [classCourseId, showScheduleClassModal]);

  async function loadRosterForClass(courseId: string) {
    setLoadingRoster(true);
    try {
      const res = await fetch(`/api/academics/courses/${courseId}/enrollments`).then((r) => r.json());
      if (res.success) {
        const mapped = (res.data || []).map((e: any) => ({
          studentId: e.student.id,
          name: `${e.student.first_name} ${e.student.last_name}`,
          status: 'PRESENT' as const,
        }));
        setClassRoster(mapped);
      }
    } catch (err) {
      console.error('Error fetching roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  }

  // Handle Event Creation
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventTitle.trim() || !eventStartDate) {
      showToast('Title and start date are required', 'error');
      return;
    }

    if (eventScope === 'COURSE' && !eventCourseId) {
      showToast('Please select a course for course-scoped events', 'error');
      return;
    }

    setSubmittingEvent(true);
    try {
      const startDateTime = new Date(`${eventStartDate}T${eventStartTime}:00`);
      const endDateTime = eventEndDate ? new Date(`${eventEndDate}T${eventEndTime}:00`) : undefined;

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle.trim(),
          description: eventDescription.trim() || undefined,
          eventType,
          startAt: startDateTime.toISOString(),
          endAt: endDateTime ? endDateTime.toISOString() : undefined,
          targetScope: eventScope,
          courseId: eventScope === 'COURSE' ? eventCourseId : undefined,
          department: eventScope === 'DEPARTMENT' ? user.department : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Event added to calendar!');
        setShowAddEventModal(false);
        setEventTitle('');
        setEventDescription('');
        await fetchCalendarData();
      } else {
        showToast(data.error?.message || 'Failed to add event', 'error');
      }
    } catch (err) {
      showToast('Error saving event', 'error');
    } finally {
      setSubmittingEvent(false);
    }
  }

  // Handle Event Update
  async function handleUpdateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;

    setSubmittingEvent(true);
    try {
      const res = await fetch(`/api/calendar/events/${editingEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingEvent.title,
          description: editingEvent.description,
          eventType: editingEvent.eventType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Event updated successfully');
        setEditingEvent(null);
        await fetchCalendarData();
      } else {
        showToast(data.error?.message || 'Failed to update event', 'error');
      }
    } catch (err) {
      showToast('Error updating event', 'error');
    } finally {
      setSubmittingEvent(false);
    }
  }

  // Handle Event Deletion
  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const res = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Event deleted');
        setEditingEvent(null);
        setSelectedItemForDetails(null);
        await fetchCalendarData();
      } else {
        showToast(data.error?.message || 'Failed to delete event', 'error');
      }
    } catch (err) {
      showToast('Error deleting event', 'error');
    }
  }

  // Handle Scheduling Class (Attendance Session creation)
  async function handleScheduleClass(e: React.FormEvent) {
    e.preventDefault();
    if (!classCourseId || !classDate || !classStartTime || !classEndTime) {
      showToast('Please fill out all session details', 'error');
      return;
    }

    if (classRoster.length === 0) {
      showToast('Cannot schedule class: no students enrolled in this course', 'error');
      return;
    }

    setSubmittingClass(true);
    try {
      const sessionDateTime = new Date(`${classDate}T${classStartTime}:00`);
      const res = await fetch('/api/attendance/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: classCourseId,
          sessionDate: sessionDateTime.toISOString(),
          startTime: classStartTime,
          endTime: classEndTime,
          records: classRoster.map((r) => ({
            studentId: r.studentId,
            status: r.status,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Class scheduled & attendance session created!');
        setShowScheduleClassModal(false);
        await fetchCalendarData();
      } else {
        showToast(data.error?.message || 'Failed to schedule class', 'error');
      }
    } catch (err) {
      showToast('Error scheduling class', 'error');
    } finally {
      setSubmittingClass(false);
    }
  }

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to format ISO date to YYYY-MM-DD
  const formatItemDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterType === 'ALL') return true;
    return item.type === filterType;
  });

  // Group items by date string
  const itemsByDate: { [key: string]: CalendarItem[] } = {};
  filteredItems.forEach((item) => {
    const d = formatItemDate(item.date);
    if (!itemsByDate[d]) itemsByDate[d] = [];
    itemsByDate[d].push(item);
  });

  const getItemBadgeStyle = (type: CalendarItem['type']) => {
    switch (type) {
      case 'CLASS':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'EXAM':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'ASSIGNMENT':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'DEADLINE':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'EVENT':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getItemIcon = (type: CalendarItem['type']) => {
    switch (type) {
      case 'CLASS':
        return <CalendarCheck className="w-3.5 h-3.5" />;
      case 'EXAM':
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'ASSIGNMENT':
        return <BookOpen className="w-3.5 h-3.5" />;
      case 'DEADLINE':
        return <Clock className="w-3.5 h-3.5" />;
      case 'EVENT':
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

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

      {/* Header Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <CalendarIcon className="w-3.5 h-3.5" /> Unified Academic Calendar
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Campus Schedule & Events
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time aggregate schedule of classes, exams, assignment submissions, personal deadlines, and campus events.
          </p>
        </div>

        {/* Action Buttons for Faculty & Admin */}
        {user.role !== 'STUDENT' && (
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => {
                setClassDate(selectedDate);
                setShowScheduleClassModal(true);
              }}
              className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4 text-blue-400" />
              Schedule Class
            </button>

            <button
              onClick={() => {
                setEventStartDate(selectedDate);
                setShowAddEventModal(true);
              }}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        )}
      </div>

      {/* View Switcher & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-base font-bold text-slate-100 min-w-[160px] text-center">
            {monthNames[month]} {year}
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors ml-2"
          >
            Today
          </button>
        </div>

        {/* Type Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: 'All', value: 'ALL' },
            { label: 'Classes', value: 'CLASS' },
            { label: 'Exams', value: 'EXAM' },
            { label: 'Assignments', value: 'ASSIGNMENT' },
            { label: 'Deadlines', value: 'DEADLINE' },
            { label: 'Events', value: 'EVENT' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterType(tab.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterType === tab.value
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start lg:self-auto">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'month' ? 'bg-slate-800 text-slate-100 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Month Grid
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'agenda' ? 'bg-slate-800 text-slate-100 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Agenda View
          </button>
        </div>
      </div>

      {/* MAIN VIEW AREA */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">
          Loading unified calendar schedule...
        </div>
      ) : viewMode === 'month' ? (
        /* MONTH GRID VIEW */
        <div className="glass-card p-4 sm:p-6 overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Empty cells for leading days */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[90px] sm:min-h-[110px] rounded-xl bg-slate-950/20 border border-slate-900/50 p-1 opacity-30"
              />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayItems = itemsByDate[dateStr] || [];
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isSelected = dateStr === selectedDate;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-[90px] sm:min-h-[115px] rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/20 border-blue-500/80 shadow-md shadow-blue-500/10'
                      : isToday
                      ? 'bg-slate-900/90 border-blue-400/50'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : isSelected
                          ? 'text-blue-400 font-extrabold'
                          : 'text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {dayItems.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  {/* Day Events Preview */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemForDetails(item);
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate border font-medium flex items-center gap-1 ${getItemBadgeStyle(
                          item.type
                        )}`}
                        title={item.title}
                      >
                        {getItemIcon(item.type)}
                        <span className="truncate">{item.title}</span>
                      </div>
                    ))}

                    {dayItems.length > 2 && (
                      <div className="text-[10px] text-slate-500 font-semibold pl-1">
                        +{dayItems.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Date Day Detail Drawer */}
          {selectedDate && itemsByDate[selectedDate] && itemsByDate[selectedDate].length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Schedule for {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {itemsByDate[selectedDate].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemForDetails(item)}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 cursor-pointer space-y-2 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${getItemBadgeStyle(
                          item.type
                        )}`}
                      >
                        {getItemIcon(item.type)}
                        {item.type}
                      </span>
                      {item.startTime && (
                        <span className="text-xs text-slate-400 font-mono">
                          {item.startTime} - {item.endTime}
                        </span>
                      )}
                    </div>

                    <div className="font-semibold text-sm text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                      {item.title}
                    </div>

                    {item.courseName && (
                      <div className="text-xs text-slate-400 truncate">{item.courseName}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* AGENDA LIST VIEW */
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3">
              <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">No events found</h3>
              <p className="text-xs text-slate-400">There are no schedule items matching this filter.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItemForDetails(item)}
                className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 cursor-pointer transition-all group"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${getItemBadgeStyle(
                      item.type
                    )}`}
                  >
                    {getItemIcon(item.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getItemBadgeStyle(
                          item.type
                        )}`}
                      >
                        {item.type}
                      </span>
                      {item.eventType && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {item.eventType}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                      {item.courseName && <span>{item.courseName}</span>}
                      {item.department && <span>• {item.department}</span>}
                      {item.startTime && (
                        <span>
                          • {item.startTime} - {item.endTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-300">
                      {new Date(item.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    {item.priority && (
                      <span className="text-[10px] text-amber-400 font-semibold">{item.priority}</span>
                    )}
                  </div>

                  {item.canEdit && item.type === 'EVENT' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEvent(item);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                      title="Edit Event"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* EVENT DETAILS MODAL */}
      {selectedItemForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-6 border-slate-700 bg-slate-900/95 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${getItemBadgeStyle(
                      selectedItemForDetails.type
                    )}`}
                  >
                    {getItemIcon(selectedItemForDetails.type)}
                    {selectedItemForDetails.type}
                  </span>
                  {selectedItemForDetails.eventType && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedItemForDetails.eventType}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-100">{selectedItemForDetails.title}</h2>
              </div>
              <button
                onClick={() => setSelectedItemForDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 border-y border-slate-800 py-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="font-semibold text-slate-200">
                  {new Date(selectedItemForDetails.date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {selectedItemForDetails.startTime && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Time:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedItemForDetails.startTime} - {selectedItemForDetails.endTime}
                  </span>
                </div>
              )}

              {selectedItemForDetails.courseName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Course:</span>
                  <span className="font-semibold text-slate-200">{selectedItemForDetails.courseName}</span>
                </div>
              )}

              {selectedItemForDetails.targetScope && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Scope:</span>
                  <span className="font-semibold text-slate-200">{selectedItemForDetails.targetScope}</span>
                </div>
              )}

              {selectedItemForDetails.description && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 block mb-1">Description:</span>
                  <p className="text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                    {selectedItemForDetails.description}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Controls */}
            <div className="flex items-center justify-between pt-1">
              <div>
                {selectedItemForDetails.type === 'CLASS' && selectedItemForDetails.canEdit && (
                  <Link
                    href="/attendance"
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline flex items-center gap-1"
                  >
                    Open Session in Attendance Console →
                  </Link>
                )}

                {selectedItemForDetails.type === 'EVENT' && selectedItemForDetails.canEdit && (
                  <button
                    onClick={() => {
                      const ev = selectedItemForDetails;
                      setSelectedItemForDetails(null);
                      setEditingEvent(ev);
                    }}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Event
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedItemForDetails(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD EVENT MODAL (Faculty / Admin) */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-6 border-slate-700 bg-slate-900/95 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" /> Create Calendar Event
              </h2>
              <button
                onClick={() => setShowAddEventModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                  Event Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Guest Lecture or Campus Holiday"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="glass-input w-full text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e: any) => setEventType(e.target.value)}
                    className="glass-input w-full text-sm bg-slate-950 text-slate-100"
                  >
                    <option value="OTHER">Other</option>
                    <option value="HOLIDAY">Holiday</option>
                    <option value="MEETING">Meeting</option>
                    <option value="EXTRA_CLASS">Extra Class</option>
                    <option value="CANCELLATION">Cancellation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                    Target Scope
                  </label>
                  <select
                    value={eventScope}
                    onChange={(e: any) => setEventScope(e.target.value)}
                    className="glass-input w-full text-sm bg-slate-950 text-slate-100"
                  >
                    <option value="ALL">Entire Campus (ALL)</option>
                    <option value="DEPARTMENT">My Department</option>
                    <option value="COURSE">Specific Course</option>
                  </select>
                </div>
              </div>

              {eventScope === 'COURSE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                    Course <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={eventCourseId}
                    onChange={(e) => setEventCourseId(e.target.value)}
                    className="glass-input w-full text-sm bg-slate-950 text-slate-100"
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                    Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="glass-input w-full text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                    Time
                  </label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="glass-input w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                  Description
                </label>
                <textarea
                  placeholder="Optional details, room location, or agenda..."
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="glass-input w-full text-sm h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEvent}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {submittingEvent ? 'Adding Event...' : 'Add to Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE CLASS MODAL (Attendance Session Reuse) */}
      {showScheduleClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-6 border-slate-700 bg-slate-900/95 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-blue-400" /> Schedule Class Session
              </h2>
              <button
                onClick={() => setShowScheduleClassModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                  Course <span className="text-rose-400">*</span>
                </label>
                <select
                  value={classCourseId}
                  onChange={(e) => setClassCourseId(e.target.value)}
                  className="glass-input w-full text-sm bg-slate-950 text-slate-100"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                    Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={classDate}
                    onChange={(e) => setClassDate(e.target.value)}
                    className="glass-input w-full text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={classStartTime}
                    onChange={(e) => setClassStartTime(e.target.value)}
                    className="glass-input w-full text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={classEndTime}
                    onChange={(e) => setClassEndTime(e.target.value)}
                    className="glass-input w-full text-xs"
                    required
                  />
                </div>
              </div>

              {/* Enrolled Students Roster Preview */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold uppercase">
                  <span>Enrolled Students ({classRoster.length})</span>
                  <span className="text-slate-500 font-normal">Defaults to Present</span>
                </div>

                {loadingRoster ? (
                  <div className="text-xs text-slate-400 py-4 text-center">Loading course roster...</div>
                ) : classRoster.length === 0 ? (
                  <div className="text-xs text-amber-400 py-3 text-center bg-amber-500/10 rounded-xl border border-amber-500/20">
                    No students currently enrolled in this course. Enroll students first in Course Management.
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {classRoster.map((student, idx) => (
                      <div
                        key={student.studentId}
                        className="flex items-center justify-between bg-slate-950/70 p-2 rounded-lg text-xs"
                      >
                        <span className="text-slate-200 font-medium">{student.name}</span>
                        <select
                          value={student.status}
                          onChange={(e: any) => {
                            const updated = [...classRoster];
                            updated[idx].status = e.target.value;
                            setClassRoster(updated);
                          }}
                          className="bg-slate-900 text-slate-200 rounded px-2 py-0.5 text-[11px] border border-slate-700"
                        >
                          <option value="PRESENT">PRESENT</option>
                          <option value="ABSENT">ABSENT</option>
                          <option value="LATE">LATE</option>
                          <option value="EXCUSED">EXCUSED</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleClassModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClass || classRoster.length === 0}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {submittingClass ? 'Scheduling...' : 'Schedule Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EVENT MODAL */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-6 border-slate-700 bg-slate-900/95 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" /> Edit Event
              </h2>
              <button
                onClick={() => setEditingEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                  Title
                </label>
                <input
                  type="text"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="glass-input w-full text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                  Event Type
                </label>
                <select
                  value={editingEvent.eventType || 'OTHER'}
                  onChange={(e) => setEditingEvent({ ...editingEvent, eventType: e.target.value })}
                  className="glass-input w-full text-sm bg-slate-950 text-slate-100"
                >
                  <option value="OTHER">Other</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="MEETING">Meeting</option>
                  <option value="EXTRA_CLASS">Extra Class</option>
                  <option value="CANCELLATION">Cancellation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                  Description
                </label>
                <textarea
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="glass-input w-full text-sm h-24 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Event
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEvent}
                    className="btn-primary text-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
