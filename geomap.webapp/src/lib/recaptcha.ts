// src/app/api/verify-recaptcha/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { token } = await request.json();

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      {
        method: 'POST',
      }
    );

    const data = await response.json();
    return NextResponse.json({ success: data.success });
  } catch (error) {
    console.error('reCAPTCHA verification failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}