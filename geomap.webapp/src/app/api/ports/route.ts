// In src/app/api/ports/route.ts
import { NextResponse, NextRequest } from 'next/server';
import Pool from '@/lib/db';
import { PortItem } from '@/lib/types2'; // Ensure this path is correct

interface PortFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: PortItem;
}

export async function GET() {
  try {
    const client = await Pool.connect();
    try {
      // This query now fetches only the latest record for each 'internal_id'
      // to prevent sending multiple versions of the same port.
      const result = await client.query(
        `WITH latest_projects AS (
          SELECT *, ROW_NUMBER() OVER(PARTITION BY internal_id ORDER BY id DESC) as rn
          FROM project_map
          WHERE sector = 'Port'
         )
         SELECT 
          id,
          internal_id,
          line as line_number,
          modified_at as updated_at,
          data->>'ref' AS ref_id,
          data->>'project_name' AS project_name,
          data->>'project_type' AS project_type,
          data->>'city' AS city,
          data->>'country' AS country,
          data->>'zip' As zip,
          data->>'street' As street,
          data->>'email' As email,
          data->>'contact_name' As contact_name,
          data->>'website_url' As website_url,
          data->>'owner' As owner,
          data->>'stakeholders' As stakeholders,
          data->>'port_code' As port_code, 
          data->>'trade_type' AS trade_type,
          data->>'partners' AS partners,
          data->>'investment_capex' AS investment,
          data->'status_dates'->>'status' AS status,
          data->>'product_type' AS product_type,
          data->>'technology_type' AS technology_type,
          data->'capacity'->>'unit' AS capacity_unit,
          CASE 
            WHEN data->'capacity'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' 
            THEN (data->'capacity'->>'value')::double precision
            ELSE NULL
          END AS capacity_value,
          data->'storage_capacity_tonnes'->>'unit' AS storage_capacity_unit,
          CASE 
            WHEN data->'storage_capacity_tonnes'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' 
            THEN (data->'storage_capacity_tonnes'->>'value')::double precision
            ELSE NULL
          END AS storage_capacity_value,
          CASE 
            WHEN data->'coordinates'->>'latitude' ~ '^[0-9\\.-]+$' 
            THEN (data->'coordinates'->>'latitude')::double precision
            ELSE 0
          END AS latitude,
          CASE 
            WHEN data->'coordinates'->>'longitude' ~ '^[0-9\\.-]+$' 
            THEN (data->'coordinates'->>'longitude')::double precision
            ELSE 0
          END AS longitude,
          sector AS type
         FROM latest_projects
         WHERE rn = 1`
      );

      const features: PortFeature[] = result.rows.map((row) => {
        // Destructure all the properties from the row, including the new ones
        const {
          id,
          internal_id,
          line_number,
          ref_id,
          project_name,
          project_type,
          city,
          country,
          zip,
          street,
          email,
          contact_name,
          website_url,
          owner,
          stakeholders,
          port_code,
          trade_type,
          partners,
          investment,
          status,
          product_type,
          technology_type,
          capacity_unit,
          capacity_value,
          storage_capacity_unit,
          storage_capacity_value,
          latitude,
          longitude,
          type,
        } = row;

        // Create the portItem object with all fields from the interface
        const portItem: PortItem = {
          id,
          internal_id: internal_id || null,
          line_number: line_number || null,
          ref_id: ref_id || null,
          name: project_name || 'N/A',
          project_name: project_name || null,
          project_type: project_type || null,
          city: city || null,
          zip: zip || null,
          street: street || null,
          country: country || null,
          email: email || null,
          contact_name: contact_name || null,
          website_url: website_url || null,
          owner: owner || null,
          stakeholders: stakeholders || null,
          port_code: port_code || null,
          trade_type: trade_type || null,
          partners: partners || null,
          investment: investment || null,
          status: status || null,
          latitude: latitude || 0,
          longitude: longitude || 0,
          type: type.toLowerCase(),
          product_type: product_type || null,
          technology_type: technology_type || null,
          capacity_value: capacity_value || null,
          capacity_unit: capacity_unit || null,
          storage_capacity_value: storage_capacity_value || null,
          storage_capacity_unit: storage_capacity_unit || null,
        };

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [longitude || 0, latitude || 0],
          },
          properties: portItem,
        };
      });

      return NextResponse.json({
        ports: {
          type: 'FeatureCollection',
          features,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching ports data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST handler to create a new version of a port project.
 * This assumes the client has already deactivated the previous version.
 */
export async function POST(req: NextRequest) {
  try {
    const { internal_id, data } = await req.json();

    // Get user context from middleware
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');
    const userName = req.headers.get('x-user-name');

    if (!internal_id || !data) {
        return NextResponse.json({ error: 'Missing internal_id or data payload.' }, { status: 400 });
    }

    // Clean data - remove any audit fields that should be in columns
    const cleanData = { ...data };
    delete cleanData.modified_by;
    delete cleanData.modified_by_id;
    delete cleanData.modified_by_name;
    delete cleanData.modified_at;
    delete cleanData.created_by;
    delete cleanData.created_by_name;
    delete cleanData.created_at;

    // Step 1: Fetch the required metadata from the latest existing record (active or inactive).
    const previousRecordQuery = `
      SELECT file_link, tab, line
      FROM project_map
      WHERE internal_id = $1
      ORDER BY id DESC
      LIMIT 1;
    `;
    const client = await Pool.connect();
    let file_link, tab, line;

    try {
        const previousRecordResult = await client.query(previousRecordQuery, [internal_id]);

        // Step 2: Handle the case where the original project doesn't exist.
        if (previousRecordResult.rows.length === 0) {
          return NextResponse.json(
            { error: `Cannot update project: Original project with internal_id '${internal_id}' not found.` },
            { status: 404 }
          );
        }

        ({ file_link, tab, line } = previousRecordResult.rows[0]);

        // Step 3: Insert the new record as the active version with audit columns.
        const insertQuery = `
          INSERT INTO project_map (
            internal_id,
            data,
            sector,
            active,
            file_link,
            tab,
            line,
            created_at,
            created_by,
            created_by_name,
            modified_by,
            modified_by_name,
            modified_at
          )
          VALUES ($1, $2, 'Port', 0, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9, CURRENT_TIMESTAMP)
          RETURNING id;
        `;

        const values = [
            internal_id,
            cleanData, // The cleaned data without audit fields
            file_link,
            tab,
            line,
            userEmail,
            userName,
            userEmail,
            userName,
        ];

        const result = await client.query(insertQuery, values);

        return NextResponse.json(
          { message: 'Port data saved successfully', id: result.rows[0].id },
          { status: 201 }
        );
    } finally {
        client.release();
    }

  } catch (error) {
    console.error('Error in POST /api/ports:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to save port data: ${errorMessage}` }, { status: 500 });
  }
}
