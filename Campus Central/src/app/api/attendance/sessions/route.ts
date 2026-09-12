import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth-guard';
import { getSessionsForCourse } from '@/modules/attendance/attendance.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

const querySchema = z.object({
  courseId: z.string().min(1, 'courseId query param is required'),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, 'FACULTY', 'ADMIN');

    const courseId = req.nextUrl.searchParams.get('courseId') ?? '';
    const parsed = querySchema.safeParse({ courseId });
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors[0]?.message || 'Validation failed', 400);
    }

    if (user.role === 'FACULTY') {
      const course = await prisma.course.findUnique({
        where: { id: parsed.data.courseId },
        select: { faculty_id: true },
      });
      if (!course) {
        return apiError('NOT_FOUND', 'Course not found', 404);
      }
      if (course.faculty_id !== user.id) {
        return apiError('FORBIDDEN', 'You are not authorized to view sessions for this course', 403);
      }
    }

    const sessions = await getSessionsForCourse(parsed.data.courseId);
    return apiSuccess(sessions);
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    if (error.code === 'NOT_FOUND') return apiError('NOT_FOUND', error.message, 404);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to fetch sessions', 500);
  }
}
