const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let db;
let isInMemory = false;

// If explicitly configured for PostgreSQL or if standard PG environment variables exist
const connectionString = process.env.DATABASE_URL || process.env.PG_URI;
const pgHost = process.env.PG_HOST || process.env.DB_HOST;
const pgPort = process.env.PG_PORT || process.env.DB_PORT || 5432;
const pgDatabase = process.env.PG_DATABASE || process.env.DB_NAME;
const pgUser = process.env.PG_USER || process.env.DB_USER;
const pgPassword = process.env.PG_PASSWORD || process.env.DB_PASSWORD;
const pgSSL = process.env.PG_SSL === 'true' || process.env.PG_SSL === 'require';

let pool = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
} else if (pgHost && pgDatabase && pgUser) {
  pool = new Pool({
    host: pgHost,
    port: parseInt(pgPort, 10),
    database: pgDatabase,
    user: pgUser,
    password: pgPassword,
    ssl: pgSSL ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

if (pool) {
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
}

/**
 * Initialize Database (with resilient auto-fallback to pg-mem if local PG is not running)
 */
async function initDb() {
  if (pool) {
    try {
      const client = await pool.connect();
      console.log('✓ Successfully connected to PostgreSQL instance at', pgHost || 'Aiven Cloud');
      
      // Auto-run schema.sql only if tables don't exist yet (safe on restarts)
      const schemaPath = path.join(__dirname, '..', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const tableCheck = await client.query(
          `SELECT to_regclass('public.users') AS tbl`
        );
        if (!tableCheck.rows[0].tbl) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(schemaSql);
          console.log('✓ Database schema created for the first time');
        } else {
          console.log('✓ Database tables already exist — skipping schema init');
        }
      }

      client.release();
      db = pool;
      return db;
    } catch (err) {
      console.warn('⚠️ Could not connect to PostgreSQL server (' + err.message + '). Falling back to embedded pg-mem engine...');
    }
  }

  // Fallback to high-fidelity in-memory PostgreSQL engine (pg-mem)
  console.log('⚡ Initializing in-memory PostgreSQL engine (pg-mem) with persistent schema support...');
  const { newDb, DataType } = require('pg-mem');
  const memDb = newDb();

  // Register common pg functions needed by analytical queries
  memDb.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 14.0 (pg-mem)',
  });
  memDb.public.registerFunction({
    name: 'current_database',
    implementation: () => 'pennywise_db',
  });

  // Register date_trunc(unit, date)
  memDb.public.registerFunction({
    name: 'date_trunc',
    args: [DataType.text, DataType.date],
    returns: DataType.timestamp,
    implementation: (unit, d) => {
      if (!d) return null;
      const date = new Date(d);
      if (unit && unit.toLowerCase() === 'month') {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      }
      if (unit && unit.toLowerCase() === 'year') {
        return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      }
      return date;
    },
  });

  // Register date_trunc(unit, timestamp)
  memDb.public.registerFunction({
    name: 'date_trunc',
    args: [DataType.text, DataType.timestamp],
    returns: DataType.timestamp,
    implementation: (unit, d) => {
      if (!d) return null;
      const date = new Date(d);
      if (unit && unit.toLowerCase() === 'month') {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      }
      if (unit && unit.toLowerCase() === 'year') {
        return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      }
      return date;
    },
  });

  // Register to_char(date/timestamp, format)
  memDb.public.registerFunction({
    name: 'to_char',
    args: [DataType.timestamp, DataType.text],
    returns: DataType.text,
    implementation: (d, fmt) => {
      if (!d) return '';
      const date = new Date(d);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (fmt === 'YYYY-MM') {
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        return `${date.getUTCFullYear()}-${month}`;
      }
      if (fmt === 'Mon YYYY') {
        return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
      }
      if (fmt === 'Mon') {
        return months[date.getUTCMonth()];
      }
      return date.toISOString().split('T')[0];
    },
  });

  memDb.public.registerFunction({
    name: 'to_char',
    args: [DataType.date, DataType.text],
    returns: DataType.text,
    implementation: (d, fmt) => {
      if (!d) return '';
      const date = new Date(d);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (fmt === 'YYYY-MM') {
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        return `${date.getUTCFullYear()}-${month}`;
      }
      if (fmt === 'Mon YYYY') {
        return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
      }
      if (fmt === 'Mon') {
        return months[date.getUTCMonth()];
      }
      return date.toISOString().split('T')[0];
    },
  });

  // Register round(float, integer) / round(numeric, integer)
  memDb.public.registerFunction({
    name: 'round',
    args: [DataType.float, DataType.integer],
    returns: DataType.float,
    implementation: (val, prec) => {
      if (val === null || val === undefined) return null;
      const factor = Math.pow(10, prec || 0);
      return Math.round(Number(val) * factor) / factor;
    },
  });

  memDb.public.registerFunction({
    name: 'round',
    args: [DataType.float],
    returns: DataType.float,
    implementation: (val) => {
      if (val === null || val === undefined) return null;
      return Math.round(Number(val));
    },
  });

  // Execute schema.sql
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    memDb.public.none(schemaSql);
    console.log('✓ Database schema executed successfully in pg-mem');
  }

  const pgAdapter = memDb.adapters.createPg();
  db = new pgAdapter.Pool();
  isInMemory = true;
  return db;
}

// Parameterized query wrapper
async function query(text, params) {
  if (!db) {
    await initDb();
  }
  const start = Date.now();
  try {
    const res = await db.query(text, params);
    return res;
  } catch (error) {
    console.error('Database query error:', { text: text.substring(0, 100), error: error.message });
    throw error;
  }
}

module.exports = {
  initDb,
  query,
  getPool: () => db,
  isInMemory: () => isInMemory
};
