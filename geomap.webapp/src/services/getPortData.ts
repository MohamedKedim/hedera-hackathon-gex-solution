import pool from '@/lib/db';
import { GeoJSONFeatureCollection, PortItem } from '@/lib/types2';

export async function getPortData(): Promise<GeoJSONFeatureCollection> {
 const client = await pool.connect();

 try {
   const result = await client.query(`
     SELECT
       id,
       internal_id,
       data->>'ref' AS ref_id,
       data->>'port_code' AS port_code,
       data->>'project_name' AS project_name,
       data->>'project_type' AS project_type,
       data->>'name' AS name,
       data->>'city' AS city,
       data->>'street' AS street,
       data->>'zip' AS zip,
       data->>'country' AS country,
       data->>'email' AS email,
       data->>'contact_name' AS contact_name,
       data->>'website_url' AS website_url,
       data->>'owner' AS owner,
       data->>'stakeholders' AS stakeholders,
       data->>'trade_type' AS trade_type,
       data->>'partners' AS partners,
       data->>'investment' AS investment,
       data->'status'->>'current_status' AS status,
       data->'status'->>'date_online' AS date_online,
       data->>'product_type' AS product_type,
       data->>'data_source' AS data_source,
       data->>'technology_type' AS technology_type,
       data->'capacity'->>'unit' AS capacity_unit,
       CASE
         WHEN data->'capacity'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$'
         THEN (data->'capacity'->>'value')::double precision
         ELSE NULL
       END AS capacity_value,
       data->'storage_capacity'->>'unit' AS storage_capacity_unit,
       CASE
         WHEN data->'storage_capacity'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$'
         THEN (data->'storage_capacity'->>'value')::double precision
         ELSE NULL
       END AS storage_capacity_value,
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
       ), ARRAY[]::jsonb[]) AS references,
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
       sector AS type
     FROM project_map
     WHERE sector = 'Port' AND active = 1;
   `);

   const formatFeature = (item: PortItem): GeoJSONFeatureCollection['features'][0] => ({
     type: 'Feature',
     geometry: {
       type: 'Point',
       coordinates: [item.longitude ?? 0, item.latitude ?? 0],
     },
     properties: {
       id: item.id,
       internal_id: item.internal_id ?? null,
       line_number: item.line_number ?? null,
       ref_id: item.ref_id ?? null,
       port_code: item.port_code ?? null,
       name: item.name ?? null,
       project_name: item.project_name ?? null,
       project_type: item.project_type ?? null,
       city: item.city ?? null,
       street: item.street ?? null,
       zip: item.zip ?? null,
       country: item.country ?? null,
       email: item.email ?? null,
       contact_name: item.contact_name ?? null,
       website_url: item.website_url ?? null,
       owner: item.owner ?? null,
       stakeholders: item.stakeholders ?? null,
       trade_type: item.trade_type ?? null,
       partners: item.partners ?? null,
       investment: item.investment ?? null,
       status: item.status ?? null,
       latitude: item.latitude,
       longitude: item.longitude,
       type: item.type,
       product_type: item.product_type ?? null,
       technology_type: item.technology_type ?? null,
       capacity_unit: item.capacity_unit ?? null,
       capacity_value: item.capacity_value ?? null,
       storage_capacity_unit: item.storage_capacity_unit ?? null,
       storage_capacity_value: item.storage_capacity_value ?? null,
     } as PortItem,
   });

   const toGeoJSON = (rows: PortItem[]): GeoJSONFeatureCollection => ({
     type: 'FeatureCollection',
     features: rows
       .filter((r: PortItem) => r.latitude !== null && r.longitude !== null)
       .map((r: PortItem) => formatFeature(r)),
   });

   const rows: PortItem[] = result.rows.map((row) => ({
     id: row.id,
     internal_id: row.internal_id ?? null,
     line_number: null,
     ref_id: row.ref_id ?? null,
     port_code: row.port_code ?? null,
     name: row.name ?? null,
     project_name: row.project_name ?? null,
     project_type: row.project_type ?? null,
     city: row.city ?? null,
     street: row.street ?? null,
     zip: row.zip ?? null,
     country: row.country ?? null,
     email: row.email ?? null,
     contact_name: row.contact_name ?? null,
     website_url: row.website_url ?? null,
     owner: row.owner ?? null,
     stakeholders: row.stakeholders ?? null,
     trade_type: row.trade_type ?? null,
     partners: row.partners ?? null,
     investment: row.investment ?? null,
     status: row.status ?? null,
     date_online: row.date_online ?? null,
     latitude: row.latitude ?? null,
     longitude: row.longitude ?? null,
     type: row.type,
     product_type: row.product_type ?? null,
     data_source: row.data_source ?? null,
     technology_type: row.technology_type ?? null,
     capacity_unit: row.capacity_unit ?? null,
     capacity_value: row.capacity_value ?? null,
     storage_capacity_unit: row.storage_capacity_unit ?? null,
     storage_capacity_value: row.storage_capacity_value ?? null,
     references: row.references ?? null,
   }));

   console.log(`[INFO] Fetched ${rows.length} ports`);
   console.log(
     '[INFO] Ports with missing coordinates:',
     rows
       .filter((r: PortItem) => r.latitude === null || r.longitude === null)
       .map((r) => ({ internal_id: r.internal_id, project_name: r.project_name }))
   );

   return toGeoJSON(rows);
 } catch (err: unknown) {
   console.error('[getPortData ERROR]', err);
   throw new Error(`Failed to load Port data: ${err instanceof Error ? err.message : String(err)}`);
 } finally {
   client.release();
 }
}
