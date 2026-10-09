import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import * as schema from './schema'; // We'll create this file next

// Define where the database file will be stored
const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : path.resolve(__dirname, '../../shop.db');

export const sqlite = new Database(dbPath);

// Apply Pragmas as requested in Section 6
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = FULL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('busy_timeout = 5000');

// Initial Integrity Check
const integrity = sqlite.pragma('integrity_check', { simple: true });
if (integrity !== 'ok') {
  console.error('Database integrity check failed!', integrity);
  // In production, this would trigger the restore backup flow
}

export const db = drizzle(sqlite, { schema });

// Run migrations on startup automatically
export function runMigrations() {
  console.log('Running database migrations...');
  migrate(db, { migrationsFolder: path.resolve(__dirname, './migrations') });
  console.log('Migrations complete.');
}
