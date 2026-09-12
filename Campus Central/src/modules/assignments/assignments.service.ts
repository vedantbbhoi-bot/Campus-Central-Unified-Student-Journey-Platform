import { prisma } from '@/lib/prisma';
import { AuthError } from '@/lib/auth-guard';
import { invalidateTimelineCache } from '../deadlines/timeline.service';

export async function createAssignment(
  facultyId: string,
  courseId: string,
  title: string,
  instructions: string,
  maxScore: number,
  dueDate: Date
) {
  // Verify faculty teaches this course
  const course = await prisma.course.findFirst({
    where: { id: courseId, faculty_id: facultyId },
  });

  if (!course) {
    throw new AuthError('FORBIDDEN', 'Faculty is not authorized for this course');
  }

  const assignment = await prisma.assignment.create({
    data: {
      course_id: courseId,
      title,
      instructions,
      max_score: maxScore,
      due_date: dueDate,
    },
  });

  // Invalidate timeline cache for enrolled students
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { course_id: courseId },
    select: { student_id: true },
  });
  for (const e of enrollments) {
    await invalidateTimelineCache(e.student_id);
  }

  return assignment;
}

export async function submitAssignment(
  studentId: string,
  assignmentId: string,
  fileUrl: string
) {
  const submission = await prisma.assignmentSubmission.upsert({
    where: {
      assignment_id_student_id: {
        assignment_id: assignmentId,
        student_id: studentId,
      },
    },
    update: {
      file_url: fileUrl,
      submitted_at: new Date(),
      status: 'SUBMITTED',
    },
    create: {
      assignment_id: assignmentId,
      student_id: studentId,
      file_url: fileUrl,
      status: 'SUBMITTED',
    },
  });

  await invalidateTimelineCache(studentId);
  return submission;
}

export async function gradeSubmission(
  facultyId: string,
  submissionId: string,
  score: number,
  feedback: string
) {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: { course: true },
      },
    },
  });

  if (!submission) {
    throw new AuthError('NOT_FOUND', 'Submission not found');
  }

  // Verify submission belongs to a course the faculty teaches
  if (submission.assignment.course.faculty_id !== facultyId) {
    // Check if user is admin
    const facultyUser = await prisma.user.findUnique({ where: { id: facultyId } });
    if (facultyUser?.role !== 'ADMIN') {
      throw new AuthError('FORBIDDEN', 'You do not teach the course for this submission');
    }
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      score: score,
      feedback: feedback,
      status: 'GRADED',
    },
  });

  await invalidateTimelineCache(submission.student_id);
  return updated;
}

export async function getFacultySubmissionsToGrade(facultyId: string) {
  const facultyCourses = await prisma.course.findMany({
    where: { faculty_id: facultyId },
    select: { id: true },
  });
  const courseIds = facultyCourses.map((c) => c.id);

  return prisma.assignmentSubmission.findMany({
    where: {
      assignment: {
        course_id: { in: courseIds },
      },
    },
    include: {
      assignment: { select: { title: true, max_score: true, course: { select: { course_code: true } } } },
      student: { select: { first_name: true, last_name: true, email: true } },
    },
    orderBy: { submitted_at: 'desc' },
  });
}
