import { NextResponse } from 'next/server';
import Pool from '@/lib/db';

export async function GET() {
  try {
    const client = await Pool.connect();
    try {
      const result = await client.query(
        `SELECT id, internal_id, data, sector
         FROM project_map
         WHERE sector = 'Pipeline' AND active = 1;`
      );

      const features = result.rows.map((row) => {
        const { id, internal_id, data, sector } = row;

        const startCoords =
          data.start?.lng != null && data.start?.lat != null
            ? [parseFloat(data.start.lng), parseFloat(data.start.lat)]
            : [0, 0];

        const stopCoords =
          data.stop?.lng != null && data.stop?.lat != null
            ? [parseFloat(data.stop.lng), parseFloat(data.stop.lat)]
            : [0, 0];

        // Skip if invalid
        if (
          (startCoords[0] === 0 && startCoords[1] === 0) &&
          (stopCoords[0] === 0 && stopCoords[1] === 0)
        ) {
          console.warn(
            `Skipping pipeline ${internal_id}: invalid coordinates`
          );
          return null;
        }

        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [startCoords, stopCoords],
          },
          properties: {
            id,
            internal_id,
            pipeline_number: data.pipeline_nr || 'N/A',
            segment: data.segment || 'N/A',
            start_location: data.start?.location || 'N/A',
            stop_location: data.stop?.location || 'N/A',
            infrastructure_type: 'Pipeline',
            country: data.country || 'N/A',
            sector,
          },
        };
      }).filter((feature) => feature !== null);

      console.log(
        'Fetched pipelines:',
        features.map((f) => ({
          internal_id: f.properties.internal_id,
          segment: f.properties.segment,
          coordinates: f.geometry.coordinates,
        }))
      );

      return NextResponse.json({
        pipelines: {
          type: 'FeatureCollection',
          features,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching pipelines data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
