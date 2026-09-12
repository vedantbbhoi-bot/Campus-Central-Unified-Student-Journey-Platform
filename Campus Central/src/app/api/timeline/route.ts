import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getUnifiedTimeline } from '@/modules/deadlines/timeline.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const timeline = await getUnifiedTimeline(user.id);
    return apiSuccess(timeline);
  } catch (error: any) {
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to fetch timeline', error.code === 'UNAUTHORIZED' ? 401 : 500);
  }
}
