import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function apiError(code: string, message: string, status: number = 400) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}
