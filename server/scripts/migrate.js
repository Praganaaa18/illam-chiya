const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../config/db');
const { runMigrations } = require('../config/migrations');

async function migrate() {
  let connection;
  try {
    connection = await db.getConnection();
    await runMigrations(connection);
  } catch (error) {
    console.error('Migration error:', error);
    process.exitCode = 1;
  } finally {
    if (connection) connection.release();
    await db.end();
  }
}

migrate();
