import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth-guard';
import { updateCalendarEvent, deleteCalendarEvent } from '@/modules/calendar/calendar.service';
import { apiSuccess, apiError } from '@/lib/api-response';

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  eventType: z.enum(['HOLIDAY', 'MEETING', 'EXTRA_CLASS', 'CANCELLATION', 'OTHER']).optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional().nullable(),
  targetScope: z.enum(['ALL', 'COURSE', 'DEPARTMENT']).optional(),
  courseId: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireRole(req, 'FACULTY', 'ADMIN');
    const body = await req.json();
    const result = updateEventSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const updateData: any = { ...result.data };
    if (result.data.startAt) updateData.startAt = new Date(result.data.startAt);
    if (result.data.endAt) updateData.endAt = new Date(result.data.endAt);

    const updated = await updateCalendarEvent(user, params.eventId, updateData);
    return apiSuccess(updated);
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    if (error.code === 'NOT_FOUND') return apiError('NOT_FOUND', error.message, 404);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to update event', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireRole(req, 'FACULTY', 'ADMIN');
    const result = await deleteCalendarEvent(user, params.eventId);
    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    if (error.code === 'NOT_FOUND') return apiError('NOT_FOUND', error.message, 404);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to delete event', 500);
  }
}
