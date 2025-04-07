/**
 * Update players table schema to support direct team association
 */
exports.up = function(knex) {
  return knex.schema
    // Modify players table
    .table('players', function(table) {
      // Add team_id reference
      table.uuid('team_id').nullable().references('id').inTable('teams').onDelete('SET NULL');
      
      // Add pubg_name column and make pubg_id nullable
      table.string('pubg_name', 100).nullable();
      
      // Alter existing constraints
      table.dropUnique(['pubg_id']);
      
      // Create index for team_id
      table.index('team_id', 'idx_players_team_id');
    })
    .raw('UPDATE players SET pubg_name = name WHERE pubg_name IS NULL')
    .raw('ALTER TABLE players ALTER COLUMN pubg_id DROP NOT NULL')
    .raw('ALTER TABLE players ALTER COLUMN platform DROP NOT NULL');
};

exports.down = function(knex) {
  return knex.schema
    .table('players', function(table) {
      // Remove team_id and index
      table.dropIndex('team_id', 'idx_players_team_id');
      table.dropColumn('team_id');
      
      // Remove pubg_name
      table.dropColumn('pubg_name');
      
      // Restore constraints
      table.unique(['pubg_id']);
    })
    .raw('ALTER TABLE players ALTER COLUMN pubg_id SET NOT NULL')
    .raw('ALTER TABLE players ALTER COLUMN platform SET NOT NULL');
};
