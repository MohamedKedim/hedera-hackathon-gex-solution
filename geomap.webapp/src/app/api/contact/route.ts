import { NextResponse } from 'next/server';
import { sendContactEmail } from '../../lib/emailContact';

export async function POST(request: Request) {
  const { name, email, telephone, topic, message } = await request.json();
  const myEmail = process.env.EMAIL_USER || '';

  try {
    await sendContactEmail(myEmail, name || 'User', topic, message, email, telephone);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact email error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send contact email.' }, { status: 500 });
  }
}