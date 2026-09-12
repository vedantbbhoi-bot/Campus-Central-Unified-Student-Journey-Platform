import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-guard';
import { createPersonalDeadline } from '@/modules/deadlines/timeline.service';
import { apiSuccess, apiError } from '@/lib/api-response';

const deadlineSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  dueDate: z.string().datetime({ message: 'Invalid ISO date' }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  courseId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const result = deadlineSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const { title, dueDate, priority, courseId } = result.data;
    const deadline = await createPersonalDeadline(
      user.id,
      title,
      new Date(dueDate),
      priority as any,
      courseId
    );

    return apiSuccess(deadline, 201);
  } catch (error: any) {
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to create deadline', 400);
  }
}
