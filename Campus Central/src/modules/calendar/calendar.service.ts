import { prisma } from '@/lib/prisma';
import { redisGet, redisSet, redisDel } from '@/lib/redis';
import { AuthError } from '@/lib/auth-guard';

export interface CalendarItem {
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

export async function getUnifiedCalendar(userId: string, role: string): Promise<CalendarItem[]> {
  const cacheKey = `calendar:user:${userId}`;
  const cached = await redisGet<CalendarItem[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // 1. Resolve user department & relevant course IDs based on role
  let userDept = '';
  let courseIds: string[] = [];

  if (role === 'STUDENT') {
    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: { department: true, enrollments: { select: { course_id: true } } },
    });
    userDept = student?.department || '';
    courseIds = (student?.enrollments || []).map((e) => e.course_id);
  } else if (role === 'FACULTY') {
    const faculty = await prisma.user.findUnique({
      where: { id: userId },
      select: { department: true, taught_courses: { select: { id: true } } },
    });
    userDept = faculty?.department || '';
    courseIds = (faculty?.taught_courses || []).map((c) => c.id);
  } else {
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { department: true },
    });
    userDept = admin?.department || '';
  }

  // Course filtering condition
  const courseFilter = role === 'ADMIN' ? {} : { course_id: { in: courseIds } };

  // 2. Fetch scoped data in parallel
  const [sessions, exams, assignments, deadlines, events] = await Promise.all([
    // Attendance sessions
    prisma.attendanceSession.findMany({
      where: courseFilter,
      include: {
        course: { select: { id: true, course_code: true, title: true } },
      },
    }),

    // Exams
    prisma.exam.findMany({
      where: courseFilter,
      include: {
        course: { select: { id: true, course_code: true, title: true } },
      },
    }),

    // Assignments
    prisma.assignment.findMany({
      where: courseFilter,
      include: {
        course: { select: { id: true, course_code: true, title: true } },
      },
    }),

    // Personal Deadlines (user-scoped)
    prisma.deadline.findMany({
      where: { user_id: userId },
      include: {
        course: { select: { id: true, course_code: true, title: true } },
      },
    }),

    // Calendar Events
    role === 'ADMIN'
      ? prisma.calendarEvent.findMany({
          include: { course: { select: { id: true, course_code: true, title: true } } },
        })
      : prisma.calendarEvent.findMany({
          where: {
            OR: [
              { target_scope: 'ALL' },
              { target_scope: 'DEPARTMENT', department: userDept },
              { target_scope: 'COURSE', course_id: { in: courseIds } },
            ],
          },
          include: { course: { select: { id: true, course_code: true, title: true } } },
        }),
  ]);

  // 3. Normalize into unified timeline format
  const normalized: CalendarItem[] = [];

  for (const s of sessions) {
    normalized.push({
      id: s.id,
      type: 'CLASS',
      title: `${s.course.course_code} Class`,
      date: s.session_date.toISOString(),
      startTime: s.start_time,
      endTime: s.end_time,
      courseId: s.course_id,
      courseName: `${s.course.course_code} - ${s.course.title}`,
      canEdit: role !== 'STUDENT' && (role === 'ADMIN' || s.faculty_id === userId),
    });
  }

  for (const e of exams) {
    normalized.push({
      id: e.id,
      type: 'EXAM',
      title: e.title,
      date: e.exam_date.toISOString(),
      courseId: e.course_id,
      courseName: `${e.course.course_code} - ${e.course.title}`,
      priority: e.priority,
      canEdit: false,
    });
  }

  for (const a of assignments) {
    normalized.push({
      id: a.id,
      type: 'ASSIGNMENT',
      title: a.title,
      date: a.due_date.toISOString(),
      courseId: a.course_id,
      courseName: `${a.course.course_code} - ${a.course.title}`,
      maxScore: a.max_score,
      canEdit: false,
    });
  }

  for (const d of deadlines) {
    normalized.push({
      id: d.id,
      type: 'DEADLINE',
      title: d.title,
      date: d.due_date.toISOString(),
      courseId: d.course_id,
      courseName: d.course ? `${d.course.course_code} - ${d.course.title}` : 'Personal',
      priority: d.priority,
      isCompleted: d.is_completed,
      canEdit: true,
    });
  }

  for (const ev of events) {
    normalized.push({
      id: ev.id,
      type: 'EVENT',
      title: ev.title,
      description: ev.description,
      eventType: ev.event_type,
      date: ev.start_at.toISOString(),
      endDate: ev.end_at ? ev.end_at.toISOString() : null,
      targetScope: ev.target_scope,
      courseId: ev.course_id,
      courseName: ev.course ? `${ev.course.course_code} - ${ev.course.title}` : undefined,
      department: ev.department,
      canEdit: role === 'ADMIN' || ev.created_by === userId,
    });
  }

  // 4. Sort ascending by date
  normalized.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 5. Cache result under key calendar:user:${userId}, TTL 30s.
  // Deliberate simplification: Broadcast cache invalidation across all users is omitted
  // in favor of a short 30-second TTL bounding staleness.
  await redisSet(cacheKey, normalized, 30);

  return normalized;
}

export async function createCalendarEvent(
  actingUser: { id: string; role: string },
  data: {
    title: string;
    description?: string;
    eventType?: string;
    startAt: Date;
    endAt?: Date;
    targetScope?: 'ALL' | 'COURSE' | 'DEPARTMENT';
    courseId?: string;
    department?: string;
  }
) {
  const targetScope = data.targetScope || 'ALL';

  if (targetScope === 'COURSE' && !data.courseId) {
    throw new AuthError('VALIDATION_ERROR', 'Course ID is required when target scope is COURSE');
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title: data.title,
      description: data.description || null,
      event_type: data.eventType || 'OTHER',
      start_at: data.startAt,
      end_at: data.endAt || null,
      target_scope: targetScope,
      course_id: targetScope === 'COURSE' ? data.courseId : null,
      department: targetScope === 'DEPARTMENT' ? data.department : null,
      created_by: actingUser.id,
    },
    include: {
      course: { select: { id: true, course_code: true, title: true } },
    },
  });

  await redisDel(`calendar:user:${actingUser.id}`);
  return event;
}

export async function updateCalendarEvent(
  actingUser: { id: string; role: string },
  eventId: string,
  data: Partial<{
    title: string;
    description: string;
    eventType: string;
    startAt: Date;
    endAt: Date;
    targetScope: 'ALL' | 'COURSE' | 'DEPARTMENT';
    courseId: string;
    department: string;
  }>
) {
  const existing = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!existing) {
    throw new AuthError('NOT_FOUND', 'Calendar event not found');
  }

  if (actingUser.role !== 'ADMIN' && existing.created_by !== actingUser.id) {
    throw new AuthError('FORBIDDEN', 'You are not authorized to update this event');
  }

  const updated = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.eventType !== undefined && { event_type: data.eventType }),
      ...(data.startAt !== undefined && { start_at: data.startAt }),
      ...(data.endAt !== undefined && { end_at: data.endAt }),
      ...(data.targetScope !== undefined && { target_scope: data.targetScope }),
      ...(data.courseId !== undefined && { course_id: data.courseId }),
      ...(data.department !== undefined && { department: data.department }),
    },
    include: {
      course: { select: { id: true, course_code: true, title: true } },
    },
  });

  await redisDel(`calendar:user:${actingUser.id}`);
  return updated;
}

export async function deleteCalendarEvent(
  actingUser: { id: string; role: string },
  eventId: string
) {
  const existing = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!existing) {
    throw new AuthError('NOT_FOUND', 'Calendar event not found');
  }

  if (actingUser.role !== 'ADMIN' && existing.created_by !== actingUser.id) {
    throw new AuthError('FORBIDDEN', 'You are not authorized to delete this event');
  }

  await prisma.calendarEvent.delete({ where: { id: eventId } });
  await redisDel(`calendar:user:${actingUser.id}`);
  return { success: true };
}
