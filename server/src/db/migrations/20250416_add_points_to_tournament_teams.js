/**
 * Add points column to tournament_teams table for tournament standings
 */
exports.up = function(knex) {
  return knex.schema
    .table('tournament_teams', function(table) {
      // Add points column with default value of 0
      table.integer('points').notNullable().defaultTo(0);
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('tournament_teams', function(table) {
      // Remove points column
      table.dropColumn('points');
    });
};
