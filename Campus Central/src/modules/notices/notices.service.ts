import { prisma } from '@/lib/prisma';
import { redisGet, redisSet, redisDel } from '@/lib/redis';

export interface NoticeFormatted {
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

export async function getStudentNotices(studentId: string): Promise<NoticeFormatted[]> {
  const cacheKey = `notices:student:${studentId}`;
  const cached = await redisGet<NoticeFormatted[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch student details & enrollments
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { department: true, enrollments: { select: { course_id: true } } },
  });

  if (!student) return [];

  const courseIds = student.enrollments.map((e) => e.course_id);
  const department = student.department;

  // Query notices matching ALL, matching DEPARTMENT, or matching enrolled COURSE
  const notices = await prisma.notice.findMany({
    where: {
      OR: [
        { target_scope: 'ALL' },
        { target_scope: 'DEPARTMENT', department: department },
        { target_scope: 'COURSE', course_id: { in: courseIds } },
      ],
    },
    include: {
      author: { select: { first_name: true, last_name: true, role: true } },
      course: { select: { course_code: true, title: true } },
    },
    orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
  });

  const formatted: NoticeFormatted[] = notices.map((n) => ({
    id: n.id,
    author_name: `${n.author.first_name} ${n.author.last_name}`,
    author_role: n.author.role,
    title: n.title,
    content: n.content,
    target_scope: n.target_scope as any,
    course_name: n.course ? `${n.course.course_code} - ${n.course.title}` : undefined,
    department: n.department || undefined,
    is_pinned: n.is_pinned,
    created_at: n.created_at.toISOString(),
  }));

  // Write through to Redis cache (60s TTL)
  await redisSet(cacheKey, formatted, 60);

  return formatted;
}

export async function createNotice(
  authorId: string,
  title: string,
  content: string,
  targetScope: 'ALL' | 'COURSE' | 'DEPARTMENT',
  courseId?: string,
  department?: string,
  isPinned: boolean = false
) {
  const notice = await prisma.notice.create({
    data: {
      author_id: authorId,
      title,
      content,
      target_scope: targetScope,
      course_id: courseId || null,
      department: department || null,
      is_pinned: isPinned,
    },
  });

  // Invalidate notices cache for affected students
  let affectedStudentIds: string[] = [];
  if (targetScope === 'ALL') {
    const students = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } });
    affectedStudentIds = students.map((s) => s.id);
  } else if (targetScope === 'DEPARTMENT' && department) {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', department: department },
      select: { id: true },
    });
    affectedStudentIds = students.map((s) => s.id);
  } else if (targetScope === 'COURSE' && courseId) {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { course_id: courseId },
      select: { student_id: true },
    });
    affectedStudentIds = enrollments.map((e) => e.student_id);
  }

  for (const sId of affectedStudentIds) {
    await redisDel(`notices:student:${sId}`);
  }

  return notice;
}
