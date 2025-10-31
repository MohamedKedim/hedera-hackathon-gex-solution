import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1'); // Test connection

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, internalId } = await request.json();
    if (!projectId || !internalId) {
      return NextResponse.json({ error: 'Missing projectId or internalId' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Set all other records with the same internal_id to active = 0
    await client.query(
      'UPDATE project_map SET active = 0 WHERE internal_id = $1 AND id != $2',
      [internalId, projectId]
    );

    // Set the specified record to active = 1
    await client.query(
      'UPDATE project_map SET active = 1, modified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [projectId]
    );

    // Log the activation action in modification_log
    await client.query(
      `
      INSERT INTO modification_log (
        user_id, user_email, user_name, table_name, record_id, internal_id, action, old_data, new_data, timestamp, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        'admin_user', // Replace with actual user_id from auth
        'admin@example.com', // Replace with actual user_email
        'Admin', // Replace with actual user_name
        'project_map',
        projectId,
        internalId,
        'ACTIVATE',
        null,
        null,
        new Date().toISOString(),
        request.headers.get('x-forwarded-for') || null,
        request.headers.get('user-agent') || null,
      ]
    );

    await client.query('COMMIT');

    console.log('[activateRecord] Activated project:', { projectId, internalId });

    return NextResponse.json({ message: 'Record activated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[activateRecord ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}