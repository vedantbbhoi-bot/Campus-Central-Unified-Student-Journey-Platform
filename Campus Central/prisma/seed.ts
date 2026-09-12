/**
 * DEMO CREDENTIALS FOR LIVE TESTING:
 * 
 * 1. STUDENT ROLE:
 *    Name: Vedant Bhoi
 *    Email: vedant@campus.edu
 *    Password: student123
 * 
 * 2. TEACHER (FACULTY) ROLE:
 *    Name: Yash Bhure
 *    Email: yashbhure@campus.edu
 *    Password: faculty123
 * 
 * 3. ADMIN ROLE:
 *    Name: Yash More
 *    Email: yashmore@campus.edu
 *    Password: admin123
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CampusCentral database...');

  // Clean existing database records
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // Hash passwords
  const studentPassword = await bcrypt.hash('student123', 10);
  const facultyPassword = await bcrypt.hash('faculty123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  // 1. Create Users
  const student = await prisma.user.create({
    data: {
      email: 'vedant@campus.edu',
      password_hash: studentPassword,
      first_name: 'Vedant',
      last_name: 'Bhoi',
      role: 'STUDENT',
      department: 'Computer Science',
    },
  });

  const faculty = await prisma.user.create({
    data: {
      email: 'yashbhure@campus.edu',
      password_hash: facultyPassword,
      first_name: 'Yash',
      last_name: 'Bhure',
      role: 'FACULTY',
      department: 'Computer Science',
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'yashmore@campus.edu',
      password_hash: adminPassword,
      first_name: 'Yash',
      last_name: 'More',
      role: 'ADMIN',
      department: 'Academic Affairs',
    },
  });

  console.log('Created Users: Vedant Bhoi (Student), Yash Bhure (Teacher), Yash More (Admin).');

  // 2. Create Courses
  const courseCS101 = await prisma.course.create({
    data: {
      course_code: 'CS-101',
      title: 'Introduction to Distributed Systems',
      faculty_id: faculty.id,
      department: 'Computer Science',
    },
  });

  const courseCS202 = await prisma.course.create({
    data: {
      course_code: 'CS-202',
      title: 'Database Systems & Prisma ORM',
      faculty_id: faculty.id,
      department: 'Computer Science',
    },
  });

  const courseMATH301 = await prisma.course.create({
    data: {
      course_code: 'MATH-301',
      title: 'Linear Algebra & Optimization',
      faculty_id: faculty.id,
      department: 'Mathematics',
    },
  });

  // 3. Enroll Student in Courses
  await prisma.courseEnrollment.createMany({
    data: [
      { student_id: student.id, course_id: courseCS101.id },
      { student_id: student.id, course_id: courseCS202.id },
      { student_id: student.id, course_id: courseMATH301.id },
    ],
  });

  // 4. Create Attendance Sessions & Records
  // CS-101: 4 sessions held. Student attended 3, missed 1 (75% -> canMiss: 0)
  for (let i = 1; i <= 4; i++) {
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() - (5 - i) * 2);

    const session = await prisma.attendanceSession.create({
      data: {
        course_id: courseCS101.id,
        faculty_id: faculty.id,
        session_date: sessionDate,
        start_time: '09:00',
        end_time: '10:30',
      },
    });

    await prisma.attendanceRecord.create({
      data: {
        session_id: session.id,
        student_id: student.id,
        status: i === 3 ? 'ABSENT' : 'PRESENT',
      },
    });
  }

  // CS-202: 5 sessions held. Student attended 5 (100% attendance)
  for (let i = 1; i <= 5; i++) {
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() - (6 - i) * 2);

    const session = await prisma.attendanceSession.create({
      data: {
        course_id: courseCS202.id,
        faculty_id: faculty.id,
        session_date: sessionDate,
        start_time: '11:00',
        end_time: '12:30',
      },
    });

    await prisma.attendanceRecord.create({
      data: {
        session_id: session.id,
        student_id: student.id,
        status: 'PRESENT',
      },
    });
  }

  // 5. Create Assignments & Submissions
  const assignment1 = await prisma.assignment.create({
    data: {
      course_id: courseCS101.id,
      title: 'Lab 1: Distributed Consensus in Node.js',
      instructions: 'Implement Raft consensus algorithm leader election in TypeScript.',
      max_score: 100,
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.assignment.create({
    data: {
      course_id: courseCS202.id,
      title: 'Project 1: Prisma Schema Design & Indexing',
      instructions: 'Design a modular monolith schema for CampusCentral with foreign key indexes.',
      max_score: 50,
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  // Student submitted Assignment 1, graded by faculty
  await prisma.assignmentSubmission.create({
    data: {
      assignment_id: assignment1.id,
      student_id: student.id,
      file_url: 'https://github.com/vedant-bhoi/raft-consensus-lab',
      status: 'GRADED',
      score: 95,
      feedback: 'Outstanding implementation of leader heartbeats and quorum validation! Great work Vedant.',
    },
  });

  // 6. Create Exams
  await prisma.exam.create({
    data: {
      course_id: courseCS101.id,
      title: 'Midterm Exam: Distributed Systems',
      exam_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: 'URGENT',
    },
  });

  await prisma.exam.create({
    data: {
      course_id: courseMATH301.id,
      title: 'Quiz 2: Matrix Decompositions',
      exam_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      priority: 'HIGH',
    },
  });

  // 7. Create Personal Deadlines
  await prisma.deadline.create({
    data: {
      user_id: student.id,
      course_id: courseCS101.id,
      title: 'Prepare presentation slides for Distributed Systems',
      due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      priority: 'MEDIUM',
      is_completed: false,
    },
  });

  // 8. Create Notices across ALL 3 Scopes
  await prisma.notice.create({
    data: {
      author_id: admin.id,
      title: 'Campus-Wide System Maintenance Announcement',
      content: 'CampusCentral will undergo scheduled server updates on Sunday from 2 AM to 4 AM IST.',
      target_scope: 'ALL',
      is_pinned: true,
    },
  });

  await prisma.notice.create({
    data: {
      author_id: faculty.id,
      title: 'CS Department Hackathon Registration Open',
      content: 'Registration is now open for the Annual Computer Science Hackathon. Prize pool of ₹50,000!',
      target_scope: 'DEPARTMENT',
      department: 'Computer Science',
      is_pinned: false,
    },
  });

  await prisma.notice.create({
    data: {
      author_id: faculty.id,
      title: 'CS-101 Lab Hours Extended',
      content: 'Office hours for CS-101 will be extended by 2 hours on Thursdays in Building B Room 302.',
      target_scope: 'COURSE',
      course_id: courseCS101.id,
      is_pinned: true,
    },
  });

  console.log('Seeding completed successfully!');
  console.log('\nDemo Login Credentials:');
  console.log('  Student  → vedant@campus.edu       / student123');
  console.log('  Teacher  → yashbhure@campus.edu    / faculty123');
  console.log('  Admin    → yashmore@campus.edu     / admin123');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
