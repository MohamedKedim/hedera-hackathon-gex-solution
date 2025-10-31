import { NextResponse } from 'next/server';
import { getMapData } from '@/services/getMapData';

export async function GET() {
  try {
    const data = await getMapData();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
