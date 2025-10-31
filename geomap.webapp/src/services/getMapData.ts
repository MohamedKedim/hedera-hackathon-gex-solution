import pool from '@/lib/db';

export async function getMapData() {
  const client = await pool.connect();

  try {
    const allData = await client.query(`
      SELECT 
        id,
        internal_id,
        data->>'plant_name' AS name,
        data->>'city' AS city,
        data->>'country' AS country,

        -- Parse start_year (only for Production/Storage; CCUS doesn't have date_online)
        CASE
          WHEN sector IN ('Production', 'Storage') AND data->'status'->>'date_online' ~ '^[0-9]+(\\.[0-9]+)?$' 
          THEN (data->'status'->>'date_online')::float::int
          ELSE NULL
        END AS start_year,

        -- Parse capacity_mw
        CASE 
          WHEN sector = 'Production' AND data->'capacity'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' 
          THEN (data->'capacity'->>'value')::double precision
          WHEN sector = 'Storage' AND data->'capacities'->'injection'->'power_mw'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' 
          THEN (data->'capacities'->'injection'->'power_mw'->>'value')::double precision
          WHEN sector = 'CCUS' AND data->'capacity'->'estimated'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$'
          THEN (data->'capacity'->'estimated'->>'value')::double precision
          ELSE NULL
        END AS capacity_mw,

        -- Parse technology/process
        CASE
          WHEN sector = 'CCUS' THEN data->>'technology_fate'
          ELSE data->>'technology'
        END AS process,

        data->'end_use' AS end_use,

        -- Parse consumption_tpy
        CASE 
          WHEN data->>'consumption' ~ '^[0-9]+(\\.[0-9]+)?$'
          THEN (data->>'consumption')::double precision
          ELSE NULL
        END AS consumption_tpy,

        -- Parse latitude
        CASE 
          WHEN data->'coordinates'->>'latitude' ~ '^[0-9\\.-]+$' 
          THEN (data->'coordinates'->>'latitude')::double precision
          WHEN data->'status'->'coordinates'->>'latitude' ~ '^[0-9\\.-]+$' 
          THEN (data->'status'->'coordinates'->>'latitude')::double precision
          WHEN data->'status_date'->'coordinates'->>'latitude' ~ '^[0-9\\.-]+$' 
          THEN (data->'status_date'->'coordinates'->>'latitude')::double precision
          ELSE NULL
        END AS latitude,

        -- Parse longitude
        CASE 
          WHEN data->'coordinates'->>'longitude' ~ '^[0-9\\.-]+$' 
          THEN (data->'coordinates'->>'longitude')::double precision
          WHEN data->'status'->'coordinates'->>'longitude' ~ '^[0-9\\.-]+$' 
          THEN (data->'status'->'coordinates'->>'longitude')::double precision
          WHEN data->'status_date'->'coordinates'->>'longitude' ~ '^[0-9\\.-]+$' 
          THEN (data->'status_date'->'coordinates'->>'longitude')::double precision
          ELSE NULL
        END AS longitude,

        -- Parse status field depending on sector
        CASE 
          WHEN sector = 'CCUS' THEN data->'status_date'->>'project_status'
          ELSE data->'status'->>'current_status'
        END AS status,

        data->>'secondary_product' AS secondary_product,
        sector AS type

      FROM project_map
      WHERE sector IN ('Production', 'Storage', 'CCUS')
    `);

    const formatFeature = (item: any) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [item.longitude ?? 0, item.latitude ?? 0],
      },
      properties: {
        id: item.id,
        internal_id: item.internal_id,
        name: item.name ?? 'Unknown Feature',
        type: item.type, // Production / Storage / CCUS
        status: String(item.status ?? ''),
        start_year: item.start_year ?? null,
        capacity_mw: item.capacity_mw ?? null,
        process: String(item.process ?? ''),
        end_use: Array.isArray(item.end_use) ? item.end_use.join(', ') : String(item.end_use ?? ''),
        consumption_tpy: item.consumption_tpy ?? null,
        city: String(item.city ?? ''),
        country: String(item.country ?? ''),
        secondary_product: String(item.secondary_product ?? ''),
      },
    });

    const toGeoJSON = (rows: any[]) => ({
      type: 'FeatureCollection',
      features: rows
        .filter(r => r.latitude !== null && r.longitude !== null)
        .map(r => formatFeature(r)),
    });

    // Separate rows by type for frontend
    const hydrogenRows = allData.rows.filter(r => r.type === 'Production' || r.type === 'Storage');
    const ccusRows = allData.rows.filter(r => r.type === 'CCUS');

    // Debug missing coordinates info (optional)
    const missing = (type: string) => allData.rows.filter(r => (r.latitude === null || r.longitude === null) && r.type === type);
    console.log(`[INFO] Missing coordinates - Production: ${missing('Production').length}`);
    console.log(`[INFO] Missing coordinates - Storage: ${missing('Storage').length}`);
    console.log(`[INFO] Missing coordinates - CCUS: ${missing('CCUS').length}`);

    return {
      hydrogen: toGeoJSON(hydrogenRows),
      ccus: toGeoJSON(ccusRows),
    };
  } catch (err) {
    console.error('[getMapData ERROR]', err);
    throw new Error('Failed to load data');
  } finally {
    client.release();
  }
}
