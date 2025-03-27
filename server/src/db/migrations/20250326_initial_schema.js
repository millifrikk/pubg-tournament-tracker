/**
 * Initial database schema migration
 */
exports.up = function(knex) {
  return knex.schema
    // Enable UUID extension
    .raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    // Create users table
    .createTable('users', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('username', 50).notNullable().unique();
      table.string('email', 100).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.string('role', 20).notNullable().defaultTo('user');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('last_login').nullable();
    })
    
    // Create tournaments table
    .createTable('tournaments', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name', 100).notNullable();
      table.text('description').nullable();
      table.uuid('organizer_id').notNullable().references('id').inTable('users');
      table.timestamp('start_date').notNullable();
      table.timestamp('end_date').notNullable();
      table.string('format', 50).notNullable();
      table.string('scoring_system', 50).notNullable();
      table.jsonb('custom_scoring_table').nullable();
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_public').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Create teams table
    .createTable('teams', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name', 100).notNullable();
      table.string('tag', 10).nullable();
      table.string('logo_url', 255).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Create players table
    .createTable('players', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name', 100).notNullable();
      table.string('pubg_id', 100).notNullable().unique();
      table.string('platform', 20).notNullable();
      table.jsonb('stats').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Create team_players junction table
    .createTable('team_players', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
      table.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      table.unique(['team_id', 'player_id']);
    })
    
    // Create tournament_teams junction table
    .createTable('tournament_teams', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
      table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
      table.integer('seed_number').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      table.unique(['tournament_id', 'team_id']);
    })
    
    // Create custom_matches table
    .createTable('custom_matches', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('match_id', 100).notNullable().unique();
      table.uuid('tournament_id').nullable().references('id').inTable('tournaments').onDelete('SET NULL');
      table.uuid('registered_by').notNullable().references('id').inTable('users');
      table.integer('match_number').nullable();
      table.string('stage', 50).defaultTo('group');
      table.boolean('verified').defaultTo(false);
      table.timestamp('registered_at').defaultTo(knex.fn.now());
      table.jsonb('match_data').nullable(); // Store the complete match data from PUBG API
    })
    
    // Create match_results table
    .createTable('match_results', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('match_id', 100).notNullable().references('match_id').inTable('custom_matches');
      table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
      table.jsonb('results').notNullable();
      table.timestamp('calculated_at').defaultTo(knex.fn.now());
    })
    
    // Create tournament_standings table
    .createTable('tournament_standings', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
      table.jsonb('standings').notNullable();
      table.timestamp('calculated_at').defaultTo(knex.fn.now());
    })
    
    // Create indexes for better query performance
    .raw('CREATE INDEX idx_matches_tournament ON custom_matches(tournament_id)')
    .raw('CREATE INDEX idx_team_players_team ON team_players(team_id)')
    .raw('CREATE INDEX idx_team_players_player ON team_players(player_id)')
    .raw('CREATE INDEX idx_tournament_teams_tournament ON tournament_teams(tournament_id)')
    .raw('CREATE INDEX idx_tournament_teams_team ON tournament_teams(team_id)')
    .raw('CREATE INDEX idx_match_results_tournament ON match_results(tournament_id)')
    .raw('CREATE INDEX idx_tournament_standings_tournament ON tournament_standings(tournament_id)');
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('tournament_standings')
    .dropTableIfExists('match_results')
    .dropTableIfExists('custom_matches')
    .dropTableIfExists('tournament_teams')
    .dropTableIfExists('team_players')
    .dropTableIfExists('players')
    .dropTableIfExists('teams')
    .dropTableIfExists('tournaments')
    .dropTableIfExists('users')
    .raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
};
