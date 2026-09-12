import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth-guard';
import { submitAssignment } from '@/modules/assignments/assignments.service';
import { apiSuccess, apiError } from '@/lib/api-response';

const submitSchema = z.object({
  assignmentId: z.string().min(1, 'Assignment ID is required'),
  fileUrl: z.string().min(1, 'Submission file URL/content is required'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, 'STUDENT');
    const body = await req.json();
    const result = submitSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const { assignmentId, fileUrl } = result.data;
    const submission = await submitAssignment(user.id, assignmentId, fileUrl);

    return apiSuccess(submission, 200);
  } catch (error: any) {
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to submit assignment', 400);
  }
}
