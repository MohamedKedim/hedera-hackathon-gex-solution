import pool from '@/lib/db';
import { StorageItem, GeoJSONFeatureCollection } from '@/lib/types2';

export async function getStorageData(): Promise<GeoJSONFeatureCollection> {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT
    id,
    internal_id,
    data->>'project_name' AS project_name,
    data->>'project_type' AS project_type,
    data->>'owner' AS owner,
    data->'stakeholders' AS stakeholders,
    data->>'contact_name' AS contact_name,
    data->>'email' AS email,
    data->>'country' AS country,
    data->>'zip' AS zip,
    data->>'city' AS city,
    data->>'street' AS street,
    data->>'website_url' AS website_url,
    data->'status'->>'current_status' AS status,
    data->'status'->>'date_online' AS date_online,
    data->>'primary_product' AS primary_product,
    CASE
      WHEN data->'capacities'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$'
      THEN (data->'capacities'->>'value')::double precision
      ELSE NULL
    END AS storage_mass_kt_per_year_value,
    data->'capacities'->>'unit' AS storage_mass_kt_per_year_unit,
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
  WHERE sector = 'Storage' AND active = 1;
    `);

    const formatFeature = (item: StorageItem): GeoJSONFeatureCollection['features'][0] => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [item.longitude ?? 0, item.latitude ?? 0],
      },
      properties: {
        id: item.id,
        internal_id: item.internal_id,
        project_name: item.project_name ?? '',
        project_type: item.project_type ?? '',
        owner: item.owner ?? '',
        stakeholders: Array.isArray(item.stakeholders) ? item.stakeholders : [],
        contact_name: item.contact_name ?? '',
        email: item.email ?? '',
        country: item.country ?? '',
        zip: item.zip ?? '',
        city: item.city ?? '',
        street: item.street ?? '',
        website_url: item.website_url ?? '',
        status: item.status ?? '',
        date_online: item.date_online ?? '',
        primary_product: item.primary_product ?? '',
        storage_mass_kt_per_year_value: item.storage_mass_kt_per_year_value,
        storage_mass_kt_per_year_unit: item.storage_mass_kt_per_year_unit ?? '',
        latitude: item.latitude,
        longitude: item.longitude,
        type: item.type,
        updated_at: item.updated_at ?? null,
      } as StorageItem,
    });

    const toGeoJSON = (rows: StorageItem[]): GeoJSONFeatureCollection => ({
      type: 'FeatureCollection',
      features: rows
        .filter((r: StorageItem) => r.latitude !== null && r.longitude !== null)
        .map((r: StorageItem) => formatFeature(r)),
    });

    const rows: StorageItem[] = result.rows;
    console.log(`[INFO] Missing coordinates - Storage: ${rows.filter((r: StorageItem) => r.latitude === null || r.longitude === null).length}`);

    return toGeoJSON(rows);
  } catch (err: unknown) {
    console.error('[getStorageData ERROR]', err);
    throw new Error('Failed to load Storage data');
  } finally {
    client.release();
  }
}