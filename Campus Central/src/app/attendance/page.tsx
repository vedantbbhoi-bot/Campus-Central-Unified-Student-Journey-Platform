import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import Navigation from '@/components/Navigation';
import AttendanceClient from './AttendanceClient';

export default async function AttendancePage() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) redirect('/login');
  const user = await verifyToken(token);
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navigation user={user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AttendanceClient user={user} />
      </main>
    </div>
  );
}
