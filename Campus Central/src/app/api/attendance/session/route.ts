import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth-guard';
import { createAttendanceSession } from '@/modules/attendance/attendance.service';
import { apiSuccess, apiError } from '@/lib/api-response';

const recordSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
});

const sessionSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  sessionDate: z.string().datetime({ message: 'Invalid ISO date' }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  records: z.array(recordSchema).min(1, 'At least one student record is required'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, 'FACULTY', 'ADMIN');
    const body = await req.json();
    const result = sessionSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const { courseId, sessionDate, startTime, endTime, records } = result.data;
    const session = await createAttendanceSession(
      user.id,
      courseId,
      new Date(sessionDate),
      startTime,
      endTime,
      records
    );

    return apiSuccess(session, 201);
  } catch (error: any) {
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to create session', 400);
  }
}
