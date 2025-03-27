// Database connection configuration
require('dotenv').config({ path: '../../.env' });

const { 
  DB_HOST, 
  DB_PORT, 
  DB_USER, 
  DB_PASSWORD, 
  DB_NAME 
} = require('../config/environment');

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
    pool: {
      min: 2,
      max: 10,
    },
    debug: false,
  },
  
  test: {
    client: 'pg',
    connection: {
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: `${DB_NAME}_test`,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
    seeds: {
      directory: './seeds/test',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
  
  production: {
    client: 'pg',
    connection: {
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
