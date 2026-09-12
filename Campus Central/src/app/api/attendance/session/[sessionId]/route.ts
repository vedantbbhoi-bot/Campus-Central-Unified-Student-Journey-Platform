import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth-guard';
import {
  getSessionWithRoster,
  updateAttendanceRecords,
} from '@/modules/attendance/attendance.service';
import { apiSuccess, apiError } from '@/lib/api-response';

const recordSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
});

const patchSchema = z.object({
  records: z.array(recordSchema).min(1, 'At least one record is required'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireRole(req, 'FACULTY', 'ADMIN');
    const data = await getSessionWithRoster(params.sessionId, user);
    return apiSuccess(data);
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    if (error.code === 'NOT_FOUND') return apiError('NOT_FOUND', error.message, 404);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to fetch session', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireRole(req, 'FACULTY', 'ADMIN');
    const body = await req.json();
    const result = patchSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const updated = await updateAttendanceRecords(user, params.sessionId, result.data.records);
    return apiSuccess(updated);
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    if (error.code === 'NOT_FOUND') return apiError('NOT_FOUND', error.message, 404);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to update records', 400);
  }
}
