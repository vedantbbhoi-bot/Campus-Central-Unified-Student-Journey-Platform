import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth-guard';
import { gradeSubmission } from '@/modules/assignments/assignments.service';
import { apiSuccess, apiError } from '@/lib/api-response';

const gradeSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  score: z.number().min(0, 'Score must be non-negative'),
  feedback: z.string().default(''),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, 'FACULTY', 'ADMIN');
    const body = await req.json();
    const result = gradeSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const { submissionId, score, feedback } = result.data;
    const updatedSubmission = await gradeSubmission(user.id, submissionId, score, feedback);

    return apiSuccess(updatedSubmission, 200);
  } catch (error: any) {
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    if (error.code === 'NOT_FOUND') return apiError('NOT_FOUND', error.message, 404);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to grade submission', 400);
  }
}
