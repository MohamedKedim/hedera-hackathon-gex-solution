import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    const query = `
      SELECT DISTINCT 
        sector,
        TRIM(data->>'project_type') AS project_type
      FROM project_map
      WHERE 
        sector IN ('Production', 'Storage', 'CCUS', 'Port')
        AND data->>'project_type' IS NOT NULL 
        AND TRIM(data->>'project_type') <> ''
        AND active = 1
      ORDER BY 
        sector, project_type;
    `;

    const result = await client.query(query);

    // The rows are already in the desired format { sector: string, project_type: string }
    const project_types = result.rows;

    console.log(`[api/project-types] Fetched ${project_types.length} unique project types.`);

    return NextResponse.json({ project_types });
  } catch (error) {
    console.error('[api/project-types ERROR]', error);
    return NextResponse.json(
        { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, 
        { status: 500 }
    );
  } finally {
    client.release();
  }
}