import pool from '@/lib/db';
import { ProductionItem, GeoJSONFeatureCollection } from '@/lib/types2';

// Interface for raw query results
interface RawProductionItem {
  id: string;
  internal_id: string | null;
  name: string | null;
  project_name: string | null;
  owner: string | null;
  stakeholders: string | null; // String from database
  contact_name: string | null;
  email: string | null;
  country: string | null;
  zip: string | null;
  city: string | null;
  street: string | null;
  website_url: string | null;
  status: string | null;
  date_online: string | null;
  project_type: string | null;
  primary_product: string | null;
  secondary_product: string | null;
  technology: string | null;
  capacity_unit: string | null;
  capacity_value: number | null;
  end_use: string | null; // String from database
  investment_capex: string | null;
  latitude: number | null;
  longitude: number | null;
  type: string;
  updated_at: string | null;
}

export async function getProductionData(): Promise<GeoJSONFeatureCollection> {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT 
        id,
        internal_id,
        data->>'plant_name' AS name,
        data->>'project_name' AS project_name,
        data->>'owner' AS owner,
        data->>'stakeholders' AS stakeholders,
        data->>'contact_name' AS contact_name,
        data->>'email' AS email,
        data->>'country' AS country,
        data->>'zip' AS zip,
        data->>'city' AS city,
        data->>'street' AS street,
        data->>'website_url' AS website_url,
        data->'status'->>'current_status' AS status,
        data->'status'->>'date_online' AS date_online,
        data->>'project_type' AS project_type,
        data->>'primary_product' AS primary_product,
        data->>'secondary_product' AS secondary_product,
        data->>'technology' AS technology,
        data->'capacity'->>'unit' AS capacity_unit,
        CASE 
          WHEN data->'capacity'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' 
          THEN (data->'capacity'->>'value')::double precision
          ELSE NULL
        END AS capacity_value,
        data->>'end_use' AS end_use,
        data->>'investment_capex' AS investment_capex,
        CASE 
          WHEN data->'coordinates'->>'latitude' ~ '^[0-9\\.-]+$' 
          THEN (data->'coordinates'->>'latitude')::double precision
          ELSE NULL
        END AS latitude,
        CASE 
          WHEN data->'coordinates'->>'longitude' ~ '^[0-9\\.-]+$' 
          THEN (data->'coordinates'->>'longitude')::double precision
          ELSE NULL
        END AS longitude,
        sector AS type,
        modified_at as updated_at
      FROM project_map
      WHERE sector = 'Production' AND active = 1;
    `);

    const formatFeature = (item: RawProductionItem): GeoJSONFeatureCollection['features'][0] => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [item.longitude ?? 0, item.latitude ?? 0],
      },
      properties: {
        id: item.id,
        internal_id: item.internal_id,
        name: item.name ?? 'Unknown Feature',
        project_name: item.project_name ?? '',
        owner: item.owner ?? '',
        stakeholders: item.stakeholders ? item.stakeholders.split(',').map((s: string) => s.trim()) : [],
        contact_name: item.contact_name ?? '',
        email: item.email ?? '',
        country: item.country ?? '',
        zip: item.zip ?? '',
        city: item.city ?? '',
        street: item.street ?? '',
        website_url: item.website_url ?? '',
        status: item.status ?? '',
        date_online: item.date_online ?? '',
        project_type: item.project_type ?? '',
        primary_product: item.primary_product ?? '',
        secondary_product: item.secondary_product ?? '',
        technology: item.technology ?? '',
        capacity_unit: item.capacity_unit ?? '',
        capacity_value: item.capacity_value ?? null,
        end_use: item.end_use ? item.end_use.split(',').map((e: string) => e.trim()) : [],
        investment_capex: item.investment_capex ?? '',
        latitude: item.latitude,
        longitude: item.longitude,
        type: item.type,
        updated_at: item.updated_at ?? null,
      } as ProductionItem,
    });

    const toGeoJSON = (rows: RawProductionItem[]): GeoJSONFeatureCollection => ({
      type: 'FeatureCollection',
      features: rows
        .filter((r: RawProductionItem) => r.latitude !== null && r.longitude !== null)
        .map((r: RawProductionItem) => formatFeature(r)),
    });

    const rows: RawProductionItem[] = result.rows;
    console.log(`[INFO] Missing coordinates - Production: ${rows.filter((r: RawProductionItem) => r.latitude === null || r.longitude === null).length}`);

    return toGeoJSON(rows);
  } catch (err: unknown) {
    console.error('[getProductionData ERROR]', err);
    throw new Error('Failed to load Production data');
  } finally {
    client.release();
  }
}