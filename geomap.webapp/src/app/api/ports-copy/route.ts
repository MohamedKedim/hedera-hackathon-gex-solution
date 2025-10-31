import { NextResponse } from 'next/server';
import { getPortData } from '@/services/getPortData';

export async function GET() {
  try {
    const portData = await getPortData();
    return NextResponse.json(portData);
  } catch (error) {
    console.error('[Ports API Error]', error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}