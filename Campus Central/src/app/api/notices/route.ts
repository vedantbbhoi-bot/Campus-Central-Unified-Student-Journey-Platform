import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/auth-guard';
import { getStudentNotices, createNotice } from '@/modules/notices/notices.service';
import { apiSuccess, apiError } from '@/lib/api-response';

const noticeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  targetScope: z.enum(['ALL', 'COURSE', 'DEPARTMENT']),
  courseId: z.string().optional(),
  department: z.string().optional(),
  isPinned: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const notices = await getStudentNotices(user.id);
    return apiSuccess(notices);
  } catch (error: any) {
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to fetch notices', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, 'FACULTY', 'ADMIN');
    const body = await req.json();
    const result = noticeSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const { title, content, targetScope, courseId, department, isPinned } = result.data;
    const notice = await createNotice(
      user.id,
      title,
      content,
      targetScope as any,
      courseId,
      department || user.department,
      isPinned
    );

    return apiSuccess(notice, 201);
  } catch (error: any) {
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to create notice', 400);
  }
}
