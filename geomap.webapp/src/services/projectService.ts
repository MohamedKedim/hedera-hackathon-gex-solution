import pool from '@/lib/db';

interface UpdateProductionData {
  name: string;
  status: string;
  start_year: string | null;
  capacity_mw: string | null;
  process: string;
  end_use: string[];
  consumption_tpy: string | null;
  city: string;
  country: string;
}

export async function updateProductionFeature(internalId: string, data: UpdateProductionData) {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE project_map
      SET data = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      jsonb_set(data, '{plant_name}', $2::jsonb),
                      '{status,current_status}', $3::jsonb
                    ),
                    '{status,date_online}', $4::jsonb
                  ),
                  '{capacity,value}', $5::jsonb
                ),
                '{technology}', $6::jsonb
              ),
              '{end_use}', $7::jsonb
            ),
            '{consumption}', $8::jsonb
          ),
          '{city}', $9::jsonb
        ),
        '{country}', $10::jsonb
      ),
      created_at = CURRENT_TIMESTAMP
      WHERE internal_id = $1 AND sector = 'Production'
      RETURNING id;
    `;

    const result = await client.query(query, [
      internalId,
      JSON.stringify(data.name),
      JSON.stringify(data.status),
      JSON.stringify(data.start_year),
      JSON.stringify(data.capacity_mw),
      JSON.stringify(data.process),
      JSON.stringify(data.end_use),
      JSON.stringify(data.consumption_tpy),
      JSON.stringify(data.city),
      JSON.stringify(data.country),
    ]);

    return result.rows;
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
}
