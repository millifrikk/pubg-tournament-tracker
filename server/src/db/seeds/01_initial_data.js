const bcrypt = require('bcrypt');

/**
 * Seed the database with some initial data
 */
exports.seed = async function(knex) {
  // Clean existing tables
  await knex('tournament_standings').del();
  await knex('match_results').del();
  await knex('custom_matches').del();
  await knex('tournament_teams').del();
  await knex('team_players').del();
  await knex('players').del();
  await knex('teams').del();
  await knex('tournaments').del();
  await knex('users').del();
  
  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const [adminUser] = await knex('users').insert({
    username: 'admin',
    email: 'admin@example.com',
    password_hash: passwordHash,
    role: 'admin'
  }).returning('*');
  
  // Create regular user
  const userPasswordHash = await bcrypt.hash('user123', 10);
  const [regularUser] = await knex('users').insert({
    username: 'user',
    email: 'user@example.com',
    password_hash: userPasswordHash,
    role: 'user'
  }).returning('*');
  
  // Create a sample tournament
  const [tournament] = await knex('tournaments').insert({
    name: 'PUBG Spring Championship 2025',
    description: 'The inaugural tournament for our PUBG Tournament Tracker system.',
    organizer_id: adminUser.id,
    start_date: new Date('2025-04-15'),
    end_date: new Date('2025-04-18'),
    format: 'points-based',
    scoring_system: 'super',
    is_active: true,
    is_public: true
  }).returning('*');
  
  // Create sample teams
  const teams = await knex('teams').insert([
    {
      name: 'The Headhunters',
      tag: 'THH'
    },
    {
      name: 'Blue Zone Warriors',
      tag: 'BZW'
    },
    {
      name: 'Chicken Dinner Club',
      tag: 'CDC'
    },
    {
      name: 'Drop Zone Masters',
      tag: 'DZM'
    }
  ]).returning('*');
  
  // Register teams to tournament
  await knex('tournament_teams').insert(
    teams.map((team, index) => ({
      tournament_id: tournament.id,
      team_id: team.id,
      seed_number: index + 1
    }))
  );
  
  console.log('Database seeded successfully');
};
