import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth-guard';
import { enrollStudents, getCourseEnrollments } from '@/modules/academics/academics.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

const enrollSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, 'At least one student ID is required'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const user = await requireRole(req, 'FACULTY', 'ADMIN');

    if (user.role === 'FACULTY') {
      const course = await prisma.course.findUnique({
        where: { id: params.courseId },
        select: { faculty_id: true },
      });
      if (!course) {
        return apiError('NOT_FOUND', 'Course not found', 404);
      }
      if (course.faculty_id !== user.id) {
        return apiError('FORBIDDEN', 'You are not authorized to view this course roster', 403);
      }
    }

    const enrollments = await getCourseEnrollments(params.courseId);
    return apiSuccess(enrollments);
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    if (error.code === 'NOT_FOUND') return apiError('NOT_FOUND', error.message, 404);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to fetch course roster', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    await requireRole(req, 'ADMIN');
    const body = await req.json();
    const result = enrollSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const enrollments = await enrollStudents(params.courseId, result.data.studentIds);
    return apiSuccess(enrollments, 201);
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to enroll students', 500);
  }
}
