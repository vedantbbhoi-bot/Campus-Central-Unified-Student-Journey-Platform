import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getUnifiedCalendar } from '@/modules/calendar/calendar.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const items = await getUnifiedCalendar(user.id, user.role);
    return apiSuccess(items);
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to fetch calendar items', 500);
  }
}
