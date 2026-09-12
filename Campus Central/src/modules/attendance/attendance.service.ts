import { prisma } from '@/lib/prisma';
import { AuthError } from '@/lib/auth-guard';

export interface AttendanceStats {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  sessionsHeld: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  canMiss: number;
  mustAttend: number;
  isAtRisk: boolean;
}

export async function calculateAttendanceStats(
  studentId: string,
  courseId: string
): Promise<AttendanceStats> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { course_code: true, title: true },
  });

  const records = await prisma.attendanceRecord.findMany({
    where: {
      student_id: studentId,
      session: {
        course_id: courseId,
      },
    },
    select: { status: true },
  });

  const sessionsHeld = records.length;
  let present = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;
  let weightedPresent = 0;

  for (const r of records) {
    if (r.status === 'PRESENT') {
      present++;
      weightedPresent += 1;
    } else if (r.status === 'ABSENT') {
      absent++;
    } else if (r.status === 'LATE') {
      late++;
      weightedPresent += 0.5; // Half credit for late
    } else if (r.status === 'EXCUSED') {
      excused++;
      weightedPresent += 1; // Count excused as present credit
    }
  }

  if (sessionsHeld === 0) {
    return {
      courseId,
      courseCode: course?.course_code || 'N/A',
      courseTitle: course?.title || 'Course',
      sessionsHeld: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      percentage: 100,
      canMiss: 0,
      mustAttend: 0,
      isAtRisk: false,
    };
  }

  const percentage = Math.round((weightedPresent / sessionsHeld) * 100 * 10) / 10;

  // canMiss: m <= (4 * P - 3 * T) / 3
  const canMissVal = Math.floor((4 * weightedPresent - 3 * sessionsHeld) / 3);
  const canMiss = Math.max(0, canMissVal);

  // mustAttend: a >= 3 * T - 4 * P
  const mustAttendVal = Math.ceil(3 * sessionsHeld - 4 * weightedPresent);
  const mustAttend = Math.max(0, mustAttendVal);

  const isAtRisk = canMiss === 0;

  return {
    courseId,
    courseCode: course?.course_code || 'N/A',
    courseTitle: course?.title || 'Course',
    sessionsHeld,
    present,
    absent,
    late,
    excused,
    percentage,
    canMiss,
    mustAttend,
    isAtRisk,
  };
}

export async function getStudentAllAttendanceStats(studentId: string): Promise<AttendanceStats[]> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { student_id: studentId },
    select: { course_id: true },
  });

  const statsList = await Promise.all(
    enrollments.map((e) => calculateAttendanceStats(studentId, e.course_id))
  );

  return statsList;
}

export async function createAttendanceSession(
  facultyId: string,
  courseId: string,
  sessionDate: Date,
  startTime: string,
  endTime: string,
  records: { studentId: string; status: string }[]
) {
  const session = await prisma.attendanceSession.create({
    data: {
      course_id: courseId,
      faculty_id: facultyId,
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      records: {
        create: records.map((r) => ({
          student_id: r.studentId,
          status: r.status,
        })),
      },
    },
    include: {
      records: true,
    },
  });

  return session;
}

export async function getSessionsForCourse(courseId: string) {
  return prisma.attendanceSession.findMany({
    where: { course_id: courseId },
    include: {
      _count: { select: { records: true } },
      course: { select: { course_code: true, title: true } },
    },
    orderBy: { session_date: 'desc' },
  });
}

/**
 * Returns a session plus every student currently enrolled in its course,
 * LEFT-JOINed with that student's AttendanceRecord for this session.
 * Students who enrolled after the session was created have `status: null`.
 */
export async function getSessionWithRoster(
  sessionId: string,
  actingUser?: { id: string; role: string }
) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      course: { select: { id: true, course_code: true, title: true, faculty_id: true } },
      records: true,
    },
  });

  if (!session) throw new AuthError('NOT_FOUND', 'Session not found');

  // ADMIN can view any session; FACULTY may only view sessions for their own courses
  if (actingUser && actingUser.role !== 'ADMIN' && session.course.faculty_id !== actingUser.id) {
    throw new AuthError('FORBIDDEN', 'You are not authorized to view this session');
  }

  // Fetch all students enrolled in the session's course
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { course_id: session.course_id },
    include: {
      student: { select: { id: true, first_name: true, last_name: true, email: true } },
    },
  });

  // Build a map of studentId → existing record status
  const recordMap = new Map(session.records.map((r) => [r.student_id, r.status]));

  const roster = enrollments.map((e) => ({
    studentId: e.student.id,
    firstName: e.student.first_name,
    lastName: e.student.last_name,
    email: e.student.email,
    // null means the student was enrolled after the session was created
    status: recordMap.get(e.student.id) ?? null,
  }));

  return { session, roster };
}

/**
 * Upserts attendance records for an existing session.
 * ADMIN may edit any session; FACULTY may only edit sessions for their own courses.
 */
export async function updateAttendanceRecords(
  actingUser: { id: string; role: string },
  sessionId: string,
  records: { studentId: string; status: string }[]
) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: { course: { select: { faculty_id: true } } },
  });

  if (!session) throw new AuthError('NOT_FOUND', 'Session not found');

  // ADMIN can bypass ownership; FACULTY must own the course
  if (actingUser.role !== 'ADMIN' && session.course.faculty_id !== actingUser.id) {
    throw new AuthError('FORBIDDEN', 'You are not authorized to edit this session');
  }

  const upserted = await Promise.all(
    records.map((r) =>
      prisma.attendanceRecord.upsert({
        where: {
          session_id_student_id: {
            session_id: sessionId,
            student_id: r.studentId,
          },
        },
        update: { status: r.status },
        create: {
          session_id: sessionId,
          student_id: r.studentId,
          status: r.status,
        },
      })
    )
  );

  return upserted;
}
