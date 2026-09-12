# CampusCentral - User & Deployment Manual

Welcome to CampusCentral! This manual is written in simple, plain English so anyone (even if you've never worked with code before) can run, use and deploy this website.

## 1. What is CampusCentral?

This is an application which unifies Students, Teachers (Faculty) and Admins into a single web platform

Here is a list of the features
1. Attendance Tracker + Smart Buffer - tells you if your overall attendance is above 75%, and how many classes you can safely skip or must attend
2. Interactive roster + session log - teachers can log attendance into past sessions
3. Course + Student enrollment management - admins can create new courses, assign faculty, enroll/remove students from classes
4. Unified academic calendar - view your classes, exams, assignment due dates, personal deadlines, and campus events on one single calendar
5. Assignments + Grading - teachers create assignments, students submit their homework links, teachers grade their submissions
6. Campus announcements - notice board with filters for the entire college, a department or a class

## 2. Prerequisites (what your computer needs to run this)

Make sure you have the following installed on your computer
1. NodeJS (v18 or higher) - you can download it from nodejs.org
2. A Web Browser - Google Chrome, Edge, Brave, Safari are recommended
3. (optional) Redis - if redis is running on your machine, we'll use it for caching purposes. If not, the app will still work, but it may show some errors

## 3. Quick Start (How to run the website)

Open your terminal (PowerShell or CMD for windows users, Terminal for Mac/Linux) and follow these steps:

1. Navigate to the project directory (where you cloned CampusCentral to)
2. Run the following commands:
```bash
npm install

# Installs all required dependencies :
npx prisma db push
npm run seed

# Sets up the database and demo accounts
npm run dev

# Start the website
```
Finally, open your browser and navigate to http://localhost:3000
## 4. Demo Accounts
We've set up three demo accounts for you to try out the website. You can log in using these credentials to switch between a Student, Faculty and Admin perspective.

| Role    | Name | Email | Password | Permissions |
|------|------|-------|----------|-------------|
| Student | Vedant Bhoi | vedant@campus.edu | student123 | Can view attendance buffer, submit homework, view schedule, add deadlines |
| Faculty (Teacher) | Yash Bhure | yashbhure@campus.edu | faculty123 | Can log attendance, create assignments, grade homework, add events |
| Admin | Yash More | yashmore@campus.edu | admin123 | Can create courses, assign teachers, enroll/remove students, post notices |

## 5. How to use the website
### A. As a Student (vedant@campus.edu)

1. Log in using the email and password mentioned in the table above
2. Dashboard
You can see your overall attendance, attendance buffer (which classes you're safely skipping or must attend), upcoming assignments, exams, and personal deadlines
3. Calendar (/calendar)
The calendar has two views - a Month Grid and an Agenda view, where you can see all your upcoming classes (in blue), exams (in rose), homework due dates (in purple) and campus events (in emerald). You can click each event to view more information like the time, place, and description.
4. Attendance (/attendance)
View your attendance buffer and statistics in more detail here
5. Assignments (/assignments)
View your assignments here. When submitting, simply click Submit and paste the link to your project (Github link or Google Drive link)

### B. As a Teacher/Faculty (yashbhure@campus.edu)

1. Log in using the email and password mentioned in the table above
2. Schedule a class or log attendance (/attendance or /calendar)
Click Schedule Class or Log Attendance, select your course and the day, and mark students as PRESENT, ABSENT, LATE, or EXCUSED
3. Edit past attendance records (/attendance)
You can scroll down and see the Past Sessions section. Click on the course name and select which session you want to edit. You can edit student attendance entries and click Save Changes when you're done.
4. Add an event to the calendar (/calendar)
Click the + Add Event button, fill in the details (title, type, date, and scope), and click Add to Calendar
5. Grade Submissions (/assignments)
View student submissions for your courses here. You can add grades (the score) and write notes for students.

### C. As an Administrator (yashmore@campus.edu)
1. Log in using the email and password mentioned in the table above
2. Manage courses and student rosters (/admin/courses or click the "Courses" link in top bar)
Click Create Course, type in the course code (CS-305), course title, department, and select a faculty instructor from the dropdown. You can manage the student roster by clicking Manage Roster on the course card. You'll see all current students enrolled in the class. You can select a student from the dropdown and click Enroll Student to add them to the class. You can also click the red trash button to remove a student from the class.
3. Post campus notices (/notices)
Click Publish Notice, select the scope (ALL, DEPARTMENT or COURSE), and check Pin Notice if you want the notice to always appear at the top of everybody's feed.

## 6. Production deployment (how to publish this to the internet)
When you're ready to deploy the app to the internet, here are some guidelines:
### A. Set up a production database (PostgreSQL)
1. While we're using a simple sqlite database for development (file:./dev.db), you need a PostgreSQL database for production
2. Create a free PostgreSQL database on Supabase, Neon.tech, or AWS RDS
3. Update the prisma/schema.prisma file with your production db credentials:
```prisma
datasource db {
provider = "postgresql"
url   = env("DATABASE_URL")
}
```
4. Finally, run
```bash
npx prisma db push
```
### B. Set up production Redis (Upstash)
1. Create a free Redis instance on Upstash (upstash.com)
2. Copy the Redis Connection URL (e.g. rediss://default:xxxx@us1-xxx.upstash.io:6379)

### C. Set environment variables
Set the following environment variables in your hosting provider (Vercel, Railway, Render, etc)

| Variable         | Description                    | Example Value                                                    |
|------------------|--------------------------------|------------------------------------------------------------------|
| `DATABASE_URL`   | PostgreSQL connection string   | `postgres://user:pass@ep-cool-db.us-east-2.aws.neon.tech/campus` |
| `REDIS_URL`      | Redis connection URL           | `rediss://default:xxxx@us1-xxx.upstash.io:6379`                  |
| `JWT_SECRET`     | JWT secret for signing cookies | `your-super-long-secure-random-secret-key-32-chars`              |
| `JWT_EXPIRES_IN` | JWT token expiry time          | `7d`                                                             |

### D. Deploy to Vercel (recommended)
1. Push your code to a github repo
2. Go to vercel.com and click Add New Project
3. Import your GitHub repository
4. Set the Root Directory to CampusCentral
5. Set the environment variables we've mentioned above
6. Click Deploy
Vercel will build the Next.js app and give you a .vercel.app URL!

## 7. Troubleshooting
Q: Port 3000 is already occupied. What should I do?
A: Next.js will automatically try to use port 3001, or you can run `npm run dev -- -p 3005`
Q: How do I reset the database and have fresh demo data?
A: Simply run `npm run seed` in your terminal. It will drop the database and recreate the demo accounts

Q: Can I see all the API endpoints?
A: Check Project/API.txt for the list of all 26 API endpoints and their specs
