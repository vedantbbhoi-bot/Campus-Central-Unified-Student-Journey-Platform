import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth-guard';
import { updateCourse } from '@/modules/academics/academics.service';
import { apiSuccess, apiError } from '@/lib/api-response';

const updateCourseSchema = z.object({
  courseCode: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  facultyId: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    await requireRole(req, 'ADMIN');
    const body = await req.json();
    const result = updateCourseSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const course = await updateCourse(params.courseId, result.data);
    return apiSuccess(course);
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    if (error.code === 'VALIDATION_ERROR') return apiError('VALIDATION_ERROR', error.message, 422);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to update course', 500);
  }
}
