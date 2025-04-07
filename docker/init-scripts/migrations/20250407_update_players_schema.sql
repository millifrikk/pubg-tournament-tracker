-- Add team_id reference to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add pubg_name column if it doesn't exist
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS pubg_name VARCHAR(100);

-- Update pubg_name from name for existing records
UPDATE players 
SET pubg_name = name 
WHERE pubg_name IS NULL;

-- Make pubg_id nullable
ALTER TABLE players 
ALTER COLUMN pubg_id DROP NOT NULL;

-- Make platform nullable
ALTER TABLE players 
ALTER COLUMN platform DROP NOT NULL;

-- Create index for team_id
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
