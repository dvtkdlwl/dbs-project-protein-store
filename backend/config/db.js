// config/db.js
// Creates a MySQL connection pool so multiple requests can run concurrently.

const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'protein_store',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Export promise-based interface for async/await usage
module.exports = pool.promise();
