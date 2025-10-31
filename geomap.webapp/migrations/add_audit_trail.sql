-- Active: 1752003145412@@pg-354cdef1-mohamedbenkedim-ee47.d.aivencloud.com@22032@defaultdb
-- Migration SQL for Geomap Database
-- Add audit trail and user tracking

-- Create modification log table for tracking all changes
CREATE TABLE IF NOT EXISTS modification_log (
    id SERIAL PRIMARY KEY,
    user_id text NOT NULL,
    user_email text NOT NULL,
    user_name text,
    table_name varchar(100) NOT NULL,
    record_id integer NOT NULL,
    internal_id text,
    action varchar(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    old_data jsonb,
    new_data jsonb,
    timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address inet,
    user_agent text
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_modification_log_user_id ON modification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_modification_log_timestamp ON modification_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_modification_log_internal_id ON modification_log(internal_id);
CREATE INDEX IF NOT EXISTS idx_modification_log_table_name ON modification_log(table_name);

-- Add user tracking columns to project_map (if they don't exist)
DO $$ 
BEGIN
    -- Check and add created_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_map' AND column_name = 'created_by') THEN
        EXECUTE 'ALTER TABLE project_map ADD COLUMN created_by text';
    END IF;
    
    -- Check and add modified_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_map' AND column_name = 'modified_by') THEN
        EXECUTE 'ALTER TABLE project_map ADD COLUMN modified_by text';
    END IF;
    
    -- Check and add modified_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_map' AND column_name = 'modified_at') THEN
        EXECUTE 'ALTER TABLE project_map ADD COLUMN modified_at timestamp with time zone';
    END IF;
END $$;

-- Create function to automatically log modifications
CREATE OR REPLACE FUNCTION log_project_map_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the modification
    IF TG_OP = 'DELETE' THEN
        INSERT INTO modification_log (
            user_id, user_email, user_name, table_name, record_id, 
            internal_id, action, old_data, timestamp
        ) VALUES (
            'system', 'system@geomap.webapp', 'System', 'project_map', 
            OLD.id, OLD.internal_id, 'DELETE', 
            to_jsonb(OLD), CURRENT_TIMESTAMP
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO modification_log (
            user_id, user_email, user_name, table_name, record_id, 
            internal_id, action, old_data, new_data, timestamp
        ) VALUES (
            COALESCE((NEW.data->>'modified_by_id'), 'system'),
            COALESCE((NEW.data->>'modified_by'), 'system@geomap.webapp'),
            COALESCE((NEW.data->>'modified_by_name'), 'System'),
            'project_map', NEW.id, NEW.internal_id, 'UPDATE',
            to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO modification_log (
            user_id, user_email, user_name, table_name, record_id, 
            internal_id, action, new_data, timestamp
        ) VALUES (
            COALESCE((NEW.data->>'modified_by_id'), 'system'),
            COALESCE((NEW.data->>'modified_by'), 'system@geomap.webapp'),
            COALESCE((NEW.data->>'modified_by_name'), 'System'),
            'project_map', NEW.id, NEW.internal_id, 'CREATE',
            to_jsonb(NEW), CURRENT_TIMESTAMP
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic logging
DROP TRIGGER IF EXISTS project_map_audit_trigger ON project_map;
CREATE TRIGGER project_map_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON project_map
    FOR EACH ROW EXECUTE FUNCTION log_project_map_changes();

-- Create view for easy access to modification history
CREATE OR REPLACE VIEW modification_history AS
SELECT 
    ml.id,
    ml.user_email,
    ml.user_name,
    ml.action,
    ml.timestamp,
    ml.internal_id,
    pm.sector,
    CASE 
        WHEN ml.action = 'CREATE' THEN ml.new_data->>'project_name'
        WHEN ml.action = 'UPDATE' THEN COALESCE(ml.new_data->>'project_name', ml.old_data->>'project_name')
        ELSE ml.old_data->>'project_name'
    END as project_name,
    ml.old_data,
    ml.new_data
FROM modification_log ml
LEFT JOIN project_map pm ON pm.internal_id = ml.internal_id
ORDER BY ml.timestamp DESC;
