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
    const history = url.searchParams.get('history') === 'true'; // New flag for history data

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '12', 10);
    const offset = (page - 1) * limit;

    const sector = url.searchParams.get('sector') || null;
    const active = url.searchParams.get('active') || null;
    const modifiedBy = url.searchParams.get('modifiedBy') || null;
    const projectName = url.searchParams.get('projectName') || null;

    const queryParams: (string | number | null)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (sector) {
      conditions.push(`pm.sector ILIKE $${paramIndex++}`);
      queryParams.push(sector);
    }
    if (active !== null) {
      conditions.push(`pm.active = $${paramIndex++}`);
      queryParams.push(parseInt(active, 10));
    }
    if (modifiedBy) {
      conditions.push(`(pm.modified_by ILIKE $${paramIndex} OR pm.modified_by_name ILIKE $${paramIndex})`);
      queryParams.push(`%${modifiedBy}%`);
      paramIndex++;
    }
    if (projectName) {
      conditions.push(`pm.data->>'project_name' ILIKE $${paramIndex++}`);
      queryParams.push(`%${projectName}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    if (history) {
      // Fetch history data from modification_log
      const internalId = url.searchParams.get('internalId');
      if (!internalId) {
        return NextResponse.json({ error: 'internalId is required for history' }, { status: 400 });
      }
      conditions.push(`ml.internal_id = $${paramIndex++}`);
      queryParams.push(internalId);
      const totalQuery = `SELECT COUNT(*) FROM modification_log ml ${whereClause}`;
      const totalResult = await client.query(totalQuery, queryParams);
      const total = parseInt(totalResult.rows[0].count, 10);

      const query = `
        SELECT ml.id, ml.user_id, ml.user_email, ml.user_name, ml.table_name, 
               ml.record_id, ml.internal_id, ml.action, ml.old_data, ml.new_data, 
               ml.timestamp, ml.ip_address, ml.user_agent
        FROM modification_log ml
        ${whereClause}
        ORDER BY ml.timestamp DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      queryParams.push(limit, offset);
      const result = await client.query(query, queryParams);
      const records = result.rows.map(row => ({
        modification: {
          id: row.id,
          user_id: row.user_id,
          user_email: row.user_email,
          user_name: row.user_name,
          table_name: row.table_name,
          record_id: row.record_id,
          internal_id: row.internal_id,
          action: row.action,
          old_data: row.old_data,
          new_data: row.new_data,
          timestamp: row.timestamp,
          ip_address: row.ip_address,
          user_agent: row.user_agent,
        },
      }));
      return NextResponse.json({ records, total });
    } else {
      // Fetch only project_map data
      const totalQuery = `SELECT COUNT(*) FROM project_map pm ${whereClause}`;
      const totalResult = await client.query(totalQuery, queryParams);
      const total = parseInt(totalResult.rows[0].count, 10);

      const query = `
        SELECT pm.id, pm.internal_id, pm.data, pm.file_link, pm.tab, pm.line, 
               pm.created_at, pm.sector, pm.active, pm.created_by, pm.modified_by, 
               pm.modified_at, pm.created_by_name, pm.modified_by_name,
               (SELECT ml.id FROM modification_log ml WHERE ml.internal_id = pm.internal_id ORDER BY ml.timestamp DESC LIMIT 1) AS modification_id
        FROM project_map pm
        ${whereClause}
        ORDER BY pm.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      queryParams.push(limit, offset);
      const result = await client.query(query, queryParams);
      const records = result.rows.map(row => ({
        project: {
          id: row.id,
          internal_id: row.internal_id,
          data: row.data,
          file_link: row.file_link,
          tab: row.tab,
          line: row.line,
          created_at: row.created_at,
          sector: row.sector,
          active: row.active,
          created_by: row.created_by,
          modified_by: row.modified_by,
          modified_at: row.modified_at,
          created_by_name: row.created_by_name,
          modified_by_name: row.modified_by_name,
          modification_id: row.modification_id,
        },
        modification: null,
      }));
      return NextResponse.json({ records, total });
    }
  } catch (error) {
    console.error('[getRecords ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}