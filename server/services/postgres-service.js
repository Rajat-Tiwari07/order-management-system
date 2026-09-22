'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5433),
  database: process.env.DB_NAME || 'order_management',
  user: process.env.DB_USER || 'order_app',
  password: process.env.DB_PASSWORD || 'Ra@070702'
});

pool.on('connect', () => {
  console.log('PostgreSQL worker connection established');
});

pool.on('error', (error) => {
  console.error('PostgreSQL pool error:', error);
});

module.exports = pool;
