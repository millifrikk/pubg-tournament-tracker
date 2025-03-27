const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  // Clean up existing users
  await knex('users').del();
  
  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('admin123', saltRounds);
  
  // Insert admin user
  await knex('users').insert([
    {
      username: 'admin',
      email: 'admin@example.com',
      password_hash: passwordHash,
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  console.log('Admin user created successfully! Use username: admin, password: admin123');
};
