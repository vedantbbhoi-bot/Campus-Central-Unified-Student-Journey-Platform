import { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './jwt';

export async function requireAuth(req: NextRequest): Promise<TokenPayload> {
  const tokenCookie = req.cookies.get('token')?.value;
  const authHeader = req.headers.get('Authorization');
  const token = tokenCookie || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

  if (!token) {
    throw new AuthError('UNAUTHORIZED', 'Authentication token missing or invalid');
  }

  const payload = await verifyToken(token);
  if (!payload) {
    throw new AuthError('UNAUTHORIZED', 'Invalid or expired session token');
  }

  return payload;
}

export async function requireRole(req: NextRequest, ...allowedRoles: ('STUDENT' | 'FACULTY' | 'ADMIN')[]): Promise<TokenPayload> {
  const user = await requireAuth(req);
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError('FORBIDDEN', `Forbidden: User role '${user.role}' does not have permission`);
  }
  return user;
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
