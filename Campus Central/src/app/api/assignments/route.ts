import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/auth-guard';
import { createAssignment, getFacultySubmissionsToGrade } from '@/modules/assignments/assignments.service';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';

const assignmentSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  title: z.string().min(1, 'Title is required'),
  instructions: z.string().min(1, 'Instructions are required'),
  maxScore: z.number().positive('Max score must be greater than 0'),
  dueDate: z.string().datetime({ message: 'Invalid ISO date' }),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (user.role === 'STUDENT') {
      const enrollments = await prisma.courseEnrollment.findMany({
        where: { student_id: user.id },
        select: { course_id: true },
      });
      const courseIds = enrollments.map((e) => e.course_id);

      const assignments = await prisma.assignment.findMany({
        where: { course_id: { in: courseIds } },
        include: {
          course: { select: { course_code: true, title: true } },
          submissions: {
            where: { student_id: user.id },
            select: { id: true, file_url: true, submitted_at: true, status: true, score: true, feedback: true },
          },
        },
        orderBy: { due_date: 'asc' },
      });

      return apiSuccess(assignments);
    } else {
      // Faculty/Admin view: returns submissions to grade + assignments created
      const submissionsToGrade = await getFacultySubmissionsToGrade(user.id);
      return apiSuccess(submissionsToGrade);
    }
  } catch (error: any) {
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to fetch assignments', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, 'FACULTY', 'ADMIN');
    const body = await req.json();
    const result = assignmentSchema.safeParse(body);

    if (!result.success) {
      return apiError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Validation failed', 400);
    }

    const { courseId, title, instructions, maxScore, dueDate } = result.data;
    const assignment = await createAssignment(
      user.id,
      courseId,
      title,
      instructions,
      maxScore,
      new Date(dueDate)
    );

    return apiSuccess(assignment, 201);
  } catch (error: any) {
    if (error.code === 'FORBIDDEN') return apiError('FORBIDDEN', error.message, 403);
    return apiError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to create assignment', 400);
  }
}
