import { NextResponse } from 'next/server';
import { getPlantFeature } from '@/services/getPlantFeature';

export async function GET(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params; // Await params to resolve type and id
  const result = await getPlantFeature(id, type);
  return NextResponse.json(result);
}