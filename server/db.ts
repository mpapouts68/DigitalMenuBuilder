import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

function resolveDatabasePath(): string {
  const raw = process.env.DATABASE_PATH?.trim();
  if (raw) {
    return path.resolve(raw);
  }
  return path.resolve(process.cwd(), "menu.db");
}

function resolveMigrationsFolder(): string {
  const raw = process.env.MIGRATIONS_FOLDER?.trim() || "migrations";
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

// Database connection with error handling
let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;

export async function initializeDatabase() {
  try {
    const dbPath = resolveDatabasePath();
    sqlite = new Database(dbPath);
    
    // Enable WAL mode for better performance
    sqlite.pragma('journal_mode = WAL');
    
    // Initialize Drizzle
    db = drizzle(sqlite, { schema });
    
    // Run migrations
    migrate(db, { migrationsFolder: './migrations' });
    
    console.log('SQLite database initialized successfully');
    console.log(`Database file: ${dbPath}`);
    
    return { sqlite, db };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Initialize database synchronously for backward compatibility
const dbPath = resolveDatabasePath();
sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
db = drizzle(sqlite, { schema });

// Export for backward compatibility
export { sqlite, db };