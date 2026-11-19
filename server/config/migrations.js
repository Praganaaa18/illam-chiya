const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function splitStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runMigrations(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d+_.+\.sql$/i.test(file))
    .sort((left, right) => {
      const leftNumber = Number.parseInt(left, 10);
      const rightNumber = Number.parseInt(right, 10);
      return leftNumber - rightNumber || left.localeCompare(right);
    });

  for (const file of files) {
    const [existing] = await connection.execute(
      'SELECT name FROM schema_migrations WHERE name = ?',
      [file]
    );
    if (existing.length > 0) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await connection.beginTransaction();
    try {
      for (const statement of splitStatements(sql)) {
        await connection.query(statement);
      }
      await connection.execute(
        'INSERT INTO schema_migrations (name) VALUES (?)',
        [file]
      );
      await connection.commit();
      console.log(`Applied migration: ${file}`);
    } catch (error) {
      await connection.rollback();
      throw new Error(`Failed to apply migration ${file}: ${error.message}`);
    }
  }
}

module.exports = { runMigrations };
