import { prisma } from '@/lib/prisma';
import { comparePassword } from '@/lib/password';
import { signToken, TokenPayload } from '@/lib/jwt';
import { AuthError } from '@/lib/auth-guard';

export async function loginUser(email: string, password: string): Promise<{ user: TokenPayload; token: string }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const payload: TokenPayload = {
    id: user.id,
    role: user.role as 'STUDENT' | 'FACULTY' | 'ADMIN',
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    department: user.department,
  };

  const token = await signToken(payload);
  return { user: payload, token };
}
