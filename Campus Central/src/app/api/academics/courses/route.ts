import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/auth-guard';
import {
  getStudentCourses,
  getFacultyCourses,
  getAllCourses,
  getAllUsers,
  createCourse,
} from '@/modules/academics/academics.service';
import { apiSuccess, apiError } from '@/lib/api-response';

const createCourseSchema = z.object({
  courseCode: z.string().min(1, 'Course code is required'),
  title: z.string().min(1, 'Title is required'),
  department: z.string().min(1, 'Department is required'),
  facultyId: z.string().min(1, 'Faculty ID is required'),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (user.role === 'STUDENT') {
      const enrollments = await getStudentCourses(user.id);
      const courses = enrollments.map((e) => e.course);
      return apiSuccess({ courses, users: [] });
    } else if (user.role === 'FACULTY') {
      const courses = await getFacultyCourses(user.id);
      return apiSuccess({ courses, users: [] });
    } else {
      // ADMIN sees all courses and all users
      const courses = await getAllCourses();
      const users = await getAllUsers();
      return apiSuccess({ courses, users });
    }
  } catch (error: any) {
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to fetch academic data', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, 'ADMIN');
    const body = await req.json();
    const result = createCourseSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const course = await createCourse(result.data);
    return apiSuccess(course, 201);
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', error.message, 401);
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    if (error.code === 'VALIDATION_ERROR') return apiError('VALIDATION_ERROR', error.message, 422);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to create course', 500);
  }
}
