import { prisma } from '@/lib/prisma';
import { redisGet, redisSet, redisDel } from '@/lib/redis';

export interface TimelineItem {
  id: string;
  type: 'ASSIGNMENT' | 'DEADLINE' | 'EXAM';
  title: string;
  due_date: string; // ISO date string
  course_name: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: string;
  instructions?: string;
  max_score?: number;
}

export async function getUnifiedTimeline(studentId: string): Promise<TimelineItem[]> {
  const cacheKey = `timeline:student:${studentId}`;
  const cached = await redisGet<TimelineItem[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // 1. Fetch student's course enrollments
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { student_id: studentId },
    select: { course_id: true },
  });
  const courseIds = enrollments.map((e) => e.course_id);

  // 2. Fetch Assignments for these courses with student's submissions
  const assignments = await prisma.assignment.findMany({
    where: { course_id: { in: courseIds } },
    include: {
      course: { select: { title: true, course_code: true } },
      submissions: {
        where: { student_id: studentId },
        select: { status: true, score: true },
      },
    },
  });

  // 3. Fetch Personal Deadlines
  const deadlines = await prisma.deadline.findMany({
    where: { user_id: studentId },
    include: {
      course: { select: { title: true, course_code: true } },
    },
  });

  // 4. Fetch Exams for enrolled courses
  const exams = await prisma.exam.findMany({
    where: { course_id: { in: courseIds } },
    include: {
      course: { select: { title: true, course_code: true } },
    },
  });

  // 5. Normalize into unified timeline format
  const normalized: TimelineItem[] = [];

  for (const a of assignments) {
    const submission = a.submissions[0];
    const status = submission ? submission.status : 'PENDING';

    normalized.push({
      id: a.id,
      type: 'ASSIGNMENT',
      title: a.title,
      due_date: a.due_date.toISOString(),
      course_name: `${a.course.course_code} - ${a.course.title}`,
      priority: 'HIGH',
      status: status,
      instructions: a.instructions,
      max_score: a.max_score,
    });
  }

  for (const d of deadlines) {
    normalized.push({
      id: d.id,
      type: 'DEADLINE',
      title: d.title,
      due_date: d.due_date.toISOString(),
      course_name: d.course ? `${d.course.course_code} - ${d.course.title}` : 'Personal',
      priority: (d.priority as any) || 'MEDIUM',
      status: d.is_completed ? 'COMPLETED' : 'PENDING',
    });
  }

  for (const e of exams) {
    normalized.push({
      id: e.id,
      type: 'EXAM',
      title: e.title,
      due_date: e.exam_date.toISOString(),
      course_name: `${e.course.course_code} - ${e.course.title}`,
      priority: (e.priority as any) || 'URGENT',
      status: 'UPCOMING',
    });
  }

  // 6. Sort chronologically by due_date ASC
  normalized.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  // 7. Write through to Redis cache (60s TTL)
  await redisSet(cacheKey, normalized, 60);

  return normalized;
}

export async function invalidateTimelineCache(studentId: string): Promise<void> {
  const cacheKey = `timeline:student:${studentId}`;
  await redisDel(cacheKey);
}

export async function createPersonalDeadline(
  userId: string,
  title: string,
  dueDate: Date,
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  courseId?: string
) {
  const deadline = await prisma.deadline.create({
    data: {
      user_id: userId,
      title,
      due_date: dueDate,
      priority,
      course_id: courseId || null,
    },
  });

  await invalidateTimelineCache(userId);
  return deadline;
}
