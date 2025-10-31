import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { internalId, excludeProjectId } = await request.json();

    if (!internalId || excludeProjectId === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const query = `
      UPDATE project_map
      SET active = 0
      WHERE internal_id = $1 AND id != $2 AND active = 1
    `;
    await client.query(query, [internalId, excludeProjectId]);

    return NextResponse.json({ message: 'Other records deactivated successfully' });
  } catch (error) {
    console.error('[deactivateRecords ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}