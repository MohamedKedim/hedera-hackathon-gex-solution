import { Pool } from 'pg';
import { logger } from '@/lib/logger';
import { ProductionItem } from '@/lib/types2';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const updatePlantFeature = async (id: string, type: string, data: Partial<ProductionItem>) => {
  try {
    const sector = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    const result = await pool.query(
      'UPDATE project_map SET data = $1 WHERE internal_id = $2 AND sector = $3 RETURNING *',
      [data, id, sector]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Feature not found' };
    }

    return { success: true, error: null };
  } catch (error) {
    logger.error('Error updating plant feature', { error, id, type });
    return { success: false, error: 'Failed to update feature' };
  }
};