-- Migration to add created_by field to teams table
-- This migration checks if the column already exists before adding it

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'teams' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE teams ADD COLUMN created_by UUID REFERENCES users(id);
        
        -- Add an index for better performance
        CREATE INDEX idx_teams_created_by ON teams(created_by);
        
        RAISE NOTICE 'Added created_by column to teams table';
    ELSE
        RAISE NOTICE 'created_by column already exists in teams table';
    END IF;
END $$;

-- Also make sure all required indexes exist
DO $$
BEGIN
    -- Check if the teams_created_by index exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_teams_created_by'
    ) THEN
        CREATE INDEX idx_teams_created_by ON teams(created_by);
        RAISE NOTICE 'Created index idx_teams_created_by';
    END IF;
END $$;
