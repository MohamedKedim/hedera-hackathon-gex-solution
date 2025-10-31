-- Enhanced audit trail migration for Geomap Database
-- Move audit fields from JSONB data to proper columns

-- Add missing audit columns to project_map
DO $$ 
BEGIN
    -- Check and add created_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_map' AND column_name = 'created_at') THEN
        EXECUTE 'ALTER TABLE project_map ADD COLUMN created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP';
    END IF;
    
    -- Check and add created_by column (if not exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_map' AND column_name = 'created_by') THEN
        EXECUTE 'ALTER TABLE project_map ADD COLUMN created_by text';
    END IF;
    
    -- Check and add modified_by column (if not exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_map' AND column_name = 'modified_by') THEN
        EXECUTE 'ALTER TABLE project_map ADD COLUMN modified_by text';
    END IF;
    
    -- Check and add modified_at column (if not exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_map' AND column_name = 'modified_at') THEN
        EXECUTE 'ALTER TABLE project_map ADD COLUMN modified_at timestamp with time zone';
    END IF;
    
    -- Check and add created_by_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_map' AND column_name = 'created_by_name') THEN
        EXECUTE 'ALTER TABLE project_map ADD COLUMN created_by_name text';
    END IF;
    
    -- Check and add modified_by_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_map' AND column_name = 'modified_by_name') THEN
        EXECUTE 'ALTER TABLE project_map ADD COLUMN modified_by_name text';
    END IF;
END $$;

-- Migrate existing audit data from JSONB to columns
UPDATE project_map 
SET 
    created_by = COALESCE(data->>'created_by', data->>'modified_by', 'system@geomap.webapp'),
    created_by_name = COALESCE(data->>'created_by_name', data->>'modified_by_name', 'System'),
    created_at = COALESCE(
        (data->>'created_at')::timestamp with time zone,
        (data->>'modified_at')::timestamp with time zone,
        CURRENT_TIMESTAMP
    ),
    modified_by = data->>'modified_by',
    modified_by_name = data->>'modified_by_name',
    modified_at = (data->>'modified_at')::timestamp with time zone
WHERE 
    (created_by IS NULL OR modified_by IS NULL OR modified_at IS NULL)
    AND (
        data ? 'modified_by' OR 
        data ? 'modified_at' OR 
        data ? 'modified_by_name' OR
        data ? 'created_by' OR
        data ? 'created_at' OR
        data ? 'created_by_name'
    );

-- Remove audit fields from JSONB data (optional - keeps data clean)
UPDATE project_map 
SET data = data - 'modified_by' - 'modified_at' - 'modified_by_name' - 'created_by' - 'created_at' - 'created_by_name'
WHERE data ? 'modified_by' OR data ? 'modified_at' OR data ? 'modified_by_name' OR data ? 'created_by' OR data ? 'created_at' OR data ? 'created_by_name';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_map_created_by ON project_map(created_by);
CREATE INDEX IF NOT EXISTS idx_project_map_modified_by ON project_map(modified_by);
CREATE INDEX IF NOT EXISTS idx_project_map_created_at ON project_map(created_at);
CREATE INDEX IF NOT EXISTS idx_project_map_modified_at ON project_map(modified_at);

-- Update the trigger function to use columns instead of JSONB
CREATE OR REPLACE FUNCTION log_project_map_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the modification
    IF TG_OP = 'DELETE' THEN
        INSERT INTO modification_log (
            user_id, user_email, user_name, table_name, record_id, 
            internal_id, action, old_data, timestamp
        ) VALUES (
            OLD.modified_by, OLD.modified_by, OLD.modified_by_name, 'project_map', 
            OLD.id, OLD.internal_id, 'DELETE', 
            to_jsonb(OLD), CURRENT_TIMESTAMP
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO modification_log (
            user_id, user_email, user_name, table_name, record_id, 
            internal_id, action, old_data, new_data, timestamp
        ) VALUES (
            COALESCE(NEW.modified_by, 'system@geomap.webapp'),
            COALESCE(NEW.modified_by, 'system@geomap.webapp'),
            COALESCE(NEW.modified_by_name, 'System'),
            'project_map', NEW.id, NEW.internal_id, 'UPDATE',
            to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO modification_log (
            user_id, user_email, user_name, table_name, record_id, 
            internal_id, action, new_data, timestamp
        ) VALUES (
            COALESCE(NEW.created_by, NEW.modified_by, 'system@geomap.webapp'),
            COALESCE(NEW.created_by, NEW.modified_by, 'system@geomap.webapp'),
            COALESCE(NEW.created_by_name, NEW.modified_by_name, 'System'),
            'project_map', NEW.id, NEW.internal_id, 'CREATE',
            to_jsonb(NEW), CURRENT_TIMESTAMP
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy access to audit information
CREATE OR REPLACE VIEW project_audit_view AS
SELECT 
    pm.*,
    pm.created_by as creator_email,
    pm.created_by_name as creator_name,
    pm.created_at as creation_date,
    pm.modified_by as modifier_email,
    pm.modified_by_name as modifier_name,
    pm.modified_at as modification_date
FROM project_map pm
ORDER BY pm.modified_at DESC NULLS LAST, pm.created_at DESC;

COMMENT ON VIEW project_audit_view IS 'Enhanced view of project_map with clear audit trail information';
