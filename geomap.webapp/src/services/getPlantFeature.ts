import 'server-only'; // Ensures this file is server-only
import pool from '@/lib/db';
import { ProductionItem, StorageItem, CCUSItem, CCUSReference } from '@/lib/types2';

interface PlantFeatureResult {
  feature: {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: ProductionItem | StorageItem | CCUSItem;
  } | null;
  error: string | null;
}

export async function getPlantFeature(id: string, type: string): Promise<PlantFeatureResult> {
  const client = await pool.connect();
  try {
    if (!id) {
      return { feature: null, error: 'Invalid ID' };
    }

    const allowedTypes = ['production', 'storage', 'ccus'];
    if (!allowedTypes.includes(type.toLowerCase())) {
      return { feature: null, error: `Invalid feature type: ${type}` };
    }

    const sector = type.toLowerCase() === 'production' ? 'Production' : type.toLowerCase() === 'storage' ? 'Storage' : 'CCUS';

    const query = `
      SELECT 
        id,
        internal_id,
        data->>'plant_name' AS name,
        data->>'city' AS city,
        data->>'country' AS country,
        data->>'zip' AS zip,
        data->>'email' AS email,
        data->>'owner' AS owner,
        data->>'street' AS street,
        data->>'website_url' AS website_url,
        data->>'contact_name' AS contact_name,
        data->>'project_name' AS project_name,
        data->>'project_type' AS project_type,
        data->>'primary_product' AS primary_product,
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
        ${
          sector === 'Production'
            ? `
              data->'status'->>'date_online' AS date_online,
              data->'status'->>'current_status' AS status,
              data->>'secondary_product' AS secondary_product,
              data->>'technology' AS technology,
              data->'capacity'->>'unit' AS capacity_unit,
              CASE 
                WHEN data->'capacity'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' 
                THEN (data->'capacity'->>'value')::double precision
                ELSE NULL
              END AS capacity_value,
              data->>'investment_capex' AS investment_capex,
              data->>'end_use' AS end_use,
              data->>'stakeholders' AS stakeholders
            `
            : sector === 'Storage'
            ? `
              data->'status'->>'date_online' AS date_online,
              data->'status'->>'current_status' AS status,
              data->'capacities'->>'unit' AS storage_mass_kt_per_year_unit,
              CASE 
                WHEN data->'capacities'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' 
                THEN (data->'capacities'->>'value')::double precision
                ELSE NULL
              END AS storage_mass_kt_per_year_value,
              data->>'stakeholders' AS stakeholders
            `
            : `
              data->>'contact_name' AS contact,
              data->>'website_url' AS website,
              data->>'product' AS product,
              data->>'zip' AS zip,
              data->'status_date'->>'project_status' AS project_status,
              data->'status_date'->>'operation_date' AS operation_date,
              data->>'technology_fate' AS technology_fate,
              data->>'end_use_sector' AS end_use_sector,
              data->>'stakeholders' AS stakeholders,
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
                  CASE 
                    WHEN jsonb_typeof(data->'references') = 'array' THEN data->'references'
                    ELSE '[]'::jsonb
                  END
                ) AS refs
              ), ARRAY[]::jsonb[]) AS references
            `
        },
        sector AS type
      FROM project_map
      WHERE internal_id = $1 AND sector = $2 AND active = 1;
    `;

    const result = await client.query(query, [id, sector]);

    if (result.rows.length === 0) {
      return { feature: null, error: 'Feature not found' };
    }

    const item = result.rows[0];
    const latitude = typeof item.latitude === 'number' && !isNaN(item.latitude) ? item.latitude : 0;
    const longitude = typeof item.longitude === 'number' && !isNaN(item.longitude) ? item.longitude : 0;

    let properties: ProductionItem | StorageItem | CCUSItem;

    if (sector === 'Production') {
      properties = {
        id: item.id ?? '',
        internal_id: item.internal_id ?? id,
        name: item.name ?? 'Placeholder Feature',
        type: item.type ?? 'Production',
        city: item.city ?? '',
        country: item.country ?? '',
        zip: item.zip ?? '',
        email: item.email ?? '',
        owner: item.owner ?? '',
        date_online: item.date_online ?? '',
        status: item.status ?? '',
        street: item.street ?? '',
        website_url: item.website_url ?? '',
        contact_name: item.contact_name ?? '',
        project_name: item.project_name ?? '',
        project_type: item.project_type ?? '',
        primary_product: item.primary_product ?? '',
        secondary_product: item.secondary_product ?? '',
        technology: item.technology ?? '',
        capacity_unit: item.capacity_unit ?? '',
        capacity_value: item.capacity_value ?? 0,
        end_use: item.end_use ? item.end_use.split(',').map((s: string) => s.trim()) : [],
        stakeholders: item.stakeholders ? item.stakeholders.split(',').map((s: string) => s.trim()) : [],
        investment_capex: item.investment_capex ?? '',
        latitude,
        longitude,
      } as ProductionItem;
    } else if (sector === 'Storage') {
      properties = {
        id: item.id ?? '',
        internal_id: item.internal_id ?? id,
        city: item.city ?? '',
        country: item.country ?? '',
        zip: item.zip ?? '',
        email: item.email ?? '',
        owner: item.owner ?? '',
        date_online: item.date_online ?? '',
        status: item.status ?? '',
        street: item.street ?? '',
        website_url: item.website_url ?? '',
        contact_name: item.contact_name ?? '',
        project_name: item.project_name ?? '',
        project_type: item.project_type ?? '',
        primary_product: item.primary_product ?? '',
        stakeholders: item.stakeholders ? item.stakeholders.split(',').map((s: string) => s.trim()) : [],
        storage_mass_kt_per_year_unit: item.storage_mass_kt_per_year_unit ?? '',
        storage_mass_kt_per_year_value: item.storage_mass_kt_per_year_value ?? 0,
        latitude,
        longitude,
        type: item.type ?? 'Storage',
      } as StorageItem;
    } else {
      properties = {
        id: item.id ?? '',
        internal_id: item.internal_id ?? id,
        zip: item.zip ?? '',
        name: item.name ?? 'Placeholder Feature',
        type: item.type ?? 'CCUS',
        city: item.city ?? '',
        country: item.country ?? '',
        street: item.street ?? '',
        email: item.email ?? '',
        owner: item.owner ?? '',
        contact: item.contact ?? '',
        website: item.website ?? '',
        project_name: item.project_name ?? '',
        project_type: item.project_type ?? '',
        stakeholders: item.stakeholders ? item.stakeholders.split(',').map((s: string) => s.trim()) : [],
        product: item.product ?? '',
        technology_fate: item.technology_fate ?? '',
        end_use_sector: item.end_use_sector ?? '',
        capacity_unit: item.capacity_unit ?? '',
        capacity_value: item.capacity_value ?? 0,
        investment_capex: item.investment_capex ?? '',
        operation_date: item.operation_date ?? '',
        project_status: item.project_status ?? '',
        latitude,
        longitude,
        references: item.references ? item.references as CCUSReference[] : [],
      } as CCUSItem;
    }

    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [longitude, latitude] as [number, number],
      },
      properties,
    };

    return { feature, error: null };
  } catch (error) {
    console.error('[getPlantFeature ERROR]', error);
    return { feature: null, error: 'Internal server error' };
  } finally {
    client.release();
  }
}