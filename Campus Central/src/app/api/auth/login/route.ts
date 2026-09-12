import { NextRequest } from 'next/server';
import { z } from 'zod';
import { loginUser } from '@/modules/auth/auth.service';
import { apiSuccess, apiError } from '@/lib/api-response';

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.errors[0]?.message || 'Validation failed';
      return apiError('VALIDATION_ERROR', firstError, 400);
    }

    const { email, password } = result.data;
    const { user, token } = await loginUser(email, password);

    const response = apiSuccess(user);

    // Set httpOnly cookie with signed JWT
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    if (error.code === 'INVALID_CREDENTIALS') {
      return apiError('INVALID_CREDENTIALS', error.message, 401);
    }
    return apiError('INTERNAL_ERROR', error.message || 'An unexpected error occurred', 500);
  }
}
