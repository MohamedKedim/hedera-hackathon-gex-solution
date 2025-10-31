import { NextRequest, NextResponse } from 'next/server';
import { sendConfirmationEmail } from '@/app/lib/email';

export async function POST(req: NextRequest) {
  const { email, connectedUserName, plantName } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  try {
    const info = await sendConfirmationEmail(email, connectedUserName, plantName);
    return NextResponse.json({ success: true, info });
  } catch (error: any) {
    console.error('Error sending confirmation email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
