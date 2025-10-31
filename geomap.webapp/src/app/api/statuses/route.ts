import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1'); // Test connection

    const query = `
      SELECT DISTINCT 
        sector,
        CASE 
          WHEN LOWER(sector) = 'ccus' THEN 
            CASE 
              WHEN LOWER(TRIM(COALESCE((data #>> '{status_date,project_status}')::TEXT, 'unknown'))) IN ('decommsioned', 'decommssioned', 'decomisioned', 'decomissioned', 'decommissioned')
              THEN 'Decommissioned'
              ELSE LOWER(TRIM(COALESCE((data #>> '{status_date,project_status}')::TEXT, 'unknown')))
            END
          WHEN LOWER(sector) = 'port' THEN 
            CASE 
              WHEN LOWER(TRIM(COALESCE((data #>> '{status_dates,status}')::TEXT, 'unknown'))) IN ('decommsioned', 'decommssioned', 'decomisioned', 'decomissioned', 'decommissioned')
              THEN 'Decommissioned'
              ELSE LOWER(TRIM(COALESCE((data #>> '{status_dates,status}')::TEXT, 'unknown')))
            END
          WHEN LOWER(sector) = 'pipeline' THEN 
            CASE 
              WHEN LOWER(TRIM(COALESCE((data #>> '{status,current_status}')::TEXT, 'unknown'))) IN ('decommsioned', 'decommssioned', 'decomisioned', 'decomissioned', 'decommissioned')
              THEN 'Decommissioned'
              ELSE LOWER(TRIM(COALESCE((data #>> '{status,current_status}')::TEXT, 'unknown')))
            END
          ELSE 
            CASE 
              WHEN LOWER(TRIM(COALESCE((data #>> '{status,current_status}')::TEXT, 'unknown'))) IN ('decommsioned', 'decommssioned', 'decomisioned', 'decomissioned', 'decommissioned')
              THEN 'Decommissioned'
              ELSE LOWER(TRIM(COALESCE((data #>> '{status,current_status}')::TEXT, 'unknown')))
            END
        END AS current_status
      FROM project_map
      WHERE LOWER(sector) IN ('production', 'storage', 'ccus', 'port', 'pipeline')
        AND active = 1
        AND data IS NOT NULL
        AND jsonb_typeof(data) = 'object'
      ORDER BY sector, current_status
    `;

    const result = await client.query(query);

    const statuses = result.rows.map(row => ({
      sector: row.sector,
      current_status: row.current_status
    }));

    console.log('[getStatuses] Fetched statuses:', statuses);

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('[getStatuses ERROR]', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  } finally {
    client.release();
  }
}