import pool from '@/lib/db';
import { CCUSItem, GeoJSONFeatureCollection, CCUSReference } from '@/lib/types2';

// Interface for raw query results
interface RawCCUSItem {
  id: string;
  internal_id: string | null;
  name: string | null;
  project_name: string | null;
  owner: string | null;
  stakeholders: string | null; // String from database
  contact: string | null;
  email: string | null;
  country: string | null;
  zip_code: string | null;
  city: string | null;
  street: string | null;
  website: string | null;
  project_status: string | null;
  operation_date: string | null;
  project_type: string | null;
  product: string | null;
  technology_fate: string | null;
  end_use_sector: string | null; // String from database
  capacity_unit: string | null;
  capacity_value: number | null;
  investment_capex: string | null;
  references: CCUSReference[] | null;
  latitude: number | null;
  longitude: number | null;
  updated_at?: string | null;
  type: string;
}

export async function getCCUSData(): Promise<GeoJSONFeatureCollection> {
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
        data->>'contact_name' AS contact,
        data->>'email' AS email,
        data->>'country' AS country,
        data->>'zip' AS zip_code,
        data->>'city' AS city,
        data->>'street' AS street,
        data->>'website_url' AS website,
        data->'status_date'->>'project_status' AS project_status,
        data->'status_date'->>'operation_date' AS operation_date,
        data->>'project_type' AS project_type,
        data->>'product' AS product,
        data->>'technology_fate' AS technology_fate,
        data->>'end_use_sector' AS end_use_sector,
        data->'capacity'->>'unit' AS capacity_unit,
        CASE 
          WHEN data->'capacity'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' 
          THEN (data->'capacity'->>'value')::double precision
          ELSE NULL
        END AS capacity_value,
        data->>'investment_capex' AS investment_capex,
        COALESCE((
          SELECT array_agg(
            jsonb_build_object(
              'ref', refs->>'ref',
              'link', refs->>'link'
            )
          )
          FROM jsonb_array_elements(
            jsonb_build_array(
              jsonb_build_object('ref', data->'references'->>'ref1', 'link', data->'references'->>'link1'),
              jsonb_build_object('ref', data->'references'->>'ref2', 'link', data->'references'->>'link2'),
              jsonb_build_object('ref', data->'references'->>'ref3', 'link', data->'references'->>'link3'),
              jsonb_build_object('ref', data->'references'->>'ref4', 'link', data->'references'->>'link4'),
              jsonb_build_object('ref', data->'references'->>'ref5', 'link', data->'references'->>'link5'),
              jsonb_build_object('ref', data->'references'->>'ref6', 'link', data->'references'->>'link6'),
              jsonb_build_object('ref', data->'references'->>'ref7', 'link', data->'references'->>'link7')
            )
          ) AS refs
          WHERE refs->>'ref' IS NOT NULL OR refs->>'link' IS NOT NULL
        ), '{}') AS references,
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
      WHERE sector = 'CCUS' AND active = 1;
    `);

    const formatFeature = (item: RawCCUSItem): GeoJSONFeatureCollection['features'][0] => ({
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
        stakeholders: item.stakeholders ?? '',
        contact: item.contact ?? '',
        email: item.email ?? '',
        country: item.country ?? '',
        zip: item.zip_code ?? '',
        city: item.city ?? '',
        street: item.street ?? '',
        website: item.website ?? '',
        project_status: item.project_status ?? '',
        operation_date: item.operation_date ?? '',
        project_type: item.project_type ?? '',
        product: item.product ?? '',
        technology_fate: item.technology_fate ?? '',
        end_use_sector: item.end_use_sector ?? '',
        capacity_unit: item.capacity_unit ?? '',
        capacity_value: item.capacity_value ?? null,
        investment_capex: item.investment_capex ?? '',
        references: item.references ?? [],
        latitude: item.latitude,
        longitude: item.longitude,
        updated_at: item.updated_at ?? null,
        type: item.type,
      } as CCUSItem,
    });

    const toGeoJSON = (rows: RawCCUSItem[]): GeoJSONFeatureCollection => ({
      type: 'FeatureCollection',
      features: rows
        .filter((r: RawCCUSItem) => r.latitude !== null && r.longitude !== null)
        .map((r: RawCCUSItem) => formatFeature(r)),
    });

    const rows: RawCCUSItem[] = result.rows;
    console.log(`[INFO] Missing coordinates - CCUS: ${rows.filter((r: RawCCUSItem) => r.latitude === null || r.longitude === null).length}`);

    return toGeoJSON(rows);
  } catch (err: unknown) {
    console.error('[getCCUSData ERROR]', err);
    throw new Error('Failed to load CCUS data');
  } finally {
    client.release();
  }
}