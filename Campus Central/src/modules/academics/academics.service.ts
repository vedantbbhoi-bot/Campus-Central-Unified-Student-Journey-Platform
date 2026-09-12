import { prisma } from '@/lib/prisma';
import { AuthError } from '@/lib/auth-guard';

export async function getStudentCourses(studentId: string) {
  return prisma.courseEnrollment.findMany({
    where: { student_id: studentId },
    include: {
      course: {
        include: {
          faculty: { select: { first_name: true, last_name: true, email: true } },
        },
      },
    },
  });
}

export async function getFacultyCourses(facultyId: string) {
  return prisma.course.findMany({
    where: { faculty_id: facultyId },
    include: {
      _count: { select: { enrollments: true, assignments: true, attendance_sessions: true } },
    },
  });
}

export async function getAllCourses() {
  return prisma.course.findMany({
    include: {
      faculty: { select: { first_name: true, last_name: true, email: true } },
      _count: { select: { enrollments: true } },
    },
  });
}

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      role: true,
      department: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function getCourseEnrollments(courseId: string) {
  return prisma.courseEnrollment.findMany({
    where: { course_id: courseId },
    include: {
      student: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          department: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function createCourse({
  courseCode,
  title,
  department,
  facultyId,
}: {
  courseCode: string;
  title: string;
  department: string;
  facultyId: string;
}) {
  const faculty = await prisma.user.findUnique({ where: { id: facultyId } });
  if (!faculty || faculty.role !== 'FACULTY') {
    throw new AuthError('VALIDATION_ERROR', 'The specified user is not a faculty member');
  }

  return prisma.course.create({
    data: { course_code: courseCode, title, department, faculty_id: facultyId },
    include: { faculty: { select: { first_name: true, last_name: true, email: true } } },
  });
}

export async function updateCourse(
  courseId: string,
  data: { courseCode?: string; title?: string; department?: string; facultyId?: string }
) {
  if (data.facultyId) {
    const faculty = await prisma.user.findUnique({ where: { id: data.facultyId } });
    if (!faculty || faculty.role !== 'FACULTY') {
      throw new AuthError('VALIDATION_ERROR', 'The specified user is not a faculty member');
    }
  }

  return prisma.course.update({
    where: { id: courseId },
    data: {
      ...(data.courseCode && { course_code: data.courseCode }),
      ...(data.title && { title: data.title }),
      ...(data.department && { department: data.department }),
      ...(data.facultyId && { faculty_id: data.facultyId }),
    },
    include: { faculty: { select: { first_name: true, last_name: true, email: true } } },
  });
}

export async function enrollStudents(courseId: string, studentIds: string[]) {
  const operations = studentIds.map((studentId) =>
    prisma.courseEnrollment.upsert({
      where: {
        student_id_course_id: {
          student_id: studentId,
          course_id: courseId,
        },
      },
      update: {},
      create: {
        student_id: studentId,
        course_id: courseId,
      },
    })
  );

  return Promise.all(operations);
}

export async function unenrollStudent(courseId: string, studentId: string) {
  return prisma.courseEnrollment.deleteMany({
    where: { course_id: courseId, student_id: studentId },
  });
}

