import { NextResponse } from 'next/server';
import Pool from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  const client = await Pool.connect();
  try {
    const query = 'SELECT COUNT(*) FROM project_map WHERE modified_by = $1';
    const params = [email];
    const result = await client.query(query, params);
    const count = parseInt(result.rows[0].count, 10);
    console.log(`Edit count for email: ${email} => ${count}`);
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error in user-edit-limit API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
