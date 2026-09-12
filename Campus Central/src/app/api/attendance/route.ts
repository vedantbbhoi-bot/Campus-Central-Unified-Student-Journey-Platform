import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getStudentAllAttendanceStats } from '@/modules/attendance/attendance.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const stats = await getStudentAllAttendanceStats(user.id);
    return apiSuccess(stats);
  } catch (error: any) {
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to fetch attendance stats', 500);
  }
}
