-- Initialize PostgreSQL schema for PUBG Tournament Tracker

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  organizer_id UUID NOT NULL REFERENCES users(id),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  format VARCHAR(50) NOT NULL,
  scoring_system VARCHAR(50) NOT NULL,
  custom_scoring_table JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  tag VARCHAR(10),
  logo_url VARCHAR(255),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  pubg_id VARCHAR(100) NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL,
  stats JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create team_players (junction table)
CREATE TABLE IF NOT EXISTS team_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, player_id)
);

-- Create tournament_teams (junction table)
CREATE TABLE IF NOT EXISTS tournament_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  seed_number INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, team_id)
);

-- Create custom_matches table
CREATE TABLE IF NOT EXISTS custom_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id VARCHAR(100) NOT NULL UNIQUE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  registered_by UUID NOT NULL REFERENCES users(id),
  match_number INTEGER,
  stage VARCHAR(50) DEFAULT 'group',
  verified BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  match_data JSONB -- Store the complete match data from PUBG API
);

-- Create match_results table
CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id VARCHAR(100) NOT NULL REFERENCES custom_matches(match_id),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  results JSONB NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tournament_standings table
CREATE TABLE IF NOT EXISTS tournament_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  standings JSONB NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX idx_matches_tournament ON custom_matches(tournament_id);
CREATE INDEX idx_team_players_team ON team_players(team_id);
CREATE INDEX idx_team_players_player ON team_players(player_id);
CREATE INDEX idx_tournament_teams_tournament ON tournament_teams(tournament_id);
CREATE INDEX idx_tournament_teams_team ON tournament_teams(team_id);
CREATE INDEX idx_match_results_tournament ON match_results(tournament_id);
CREATE INDEX idx_tournament_standings_tournament ON tournament_standings(tournament_id);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW(); 
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Apply the trigger to all tables with updated_at column
CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_tournaments_modtime
BEFORE UPDATE ON tournaments
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_teams_modtime
BEFORE UPDATE ON teams
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_players_modtime
BEFORE UPDATE ON players
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();