import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  const response = apiSuccess({ message: 'Logged out successfully' });
  response.cookies.set('token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return response;
}
