// File: /api/admin/history/route.ts

import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const client = await pool.connect();
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const internalId = url.searchParams.get('internalId');

    if (!internalId) {
      return NextResponse.json({ error: 'Internal ID is required' }, { status: 400 });
    }

    const query = `
      SELECT 
        id, user_id, user_email, user_name, table_name, record_id, 
        internal_id, action, old_data, new_data, timestamp, 
        ip_address, user_agent
      FROM modification_log
      WHERE internal_id = $1
      ORDER BY timestamp DESC
    `;

    const result = await client.query(query, [internalId]);

    // The data is already in the correct shape, we just need to nest it
    const records = result.rows.map(row => ({
      modification: row
    }));

    return NextResponse.json({ records, total: result.rowCount });

  } catch (error) {
    console.error('[getHistory ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
