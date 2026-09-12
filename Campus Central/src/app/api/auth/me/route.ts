import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    return apiSuccess(user);
  } catch (error: any) {
    return apiError(error.code || 'UNAUTHORIZED', error.message || 'Not authenticated', 401);
  }
}
