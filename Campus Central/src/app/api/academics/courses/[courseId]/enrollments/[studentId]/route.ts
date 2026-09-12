import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { unenrollStudent } from '@/modules/academics/academics.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { courseId: string; studentId: string } }
) {
  try {
    await requireRole(req, 'ADMIN');
    await unenrollStudent(params.courseId, params.studentId);
    return apiSuccess({ success: true, message: 'Student successfully unenrolled' });
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to unenroll student', 500);
  }
}
