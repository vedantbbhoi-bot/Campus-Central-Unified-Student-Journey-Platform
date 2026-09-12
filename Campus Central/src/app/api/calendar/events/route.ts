import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth-guard';
import { createCalendarEvent } from '@/modules/calendar/calendar.service';
import { apiSuccess, apiError } from '@/lib/api-response';

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  eventType: z.enum(['HOLIDAY', 'MEETING', 'EXTRA_CLASS', 'CANCELLATION', 'OTHER']).optional(),
  startAt: z.string().min(1, 'Start date/time is required'),
  endAt: z.string().optional().nullable(),
  targetScope: z.enum(['ALL', 'COURSE', 'DEPARTMENT']).optional(),
  courseId: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, 'FACULTY', 'ADMIN');
    const body = await req.json();
    const result = createEventSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const { title, description, eventType, startAt, endAt, targetScope, courseId, department } = result.data;

    const event = await createCalendarEvent(user, {
      title,
      description: description || undefined,
      eventType: eventType || 'OTHER',
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : undefined,
      targetScope: targetScope || 'ALL',
      courseId: courseId || undefined,
      department: department || undefined,
    });

    return apiSuccess(event, 201);
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    if (error.code === 'VALIDATION_ERROR') return apiError('VALIDATION_ERROR', error.message, 400);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to create calendar event', 500);
  }
}
