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

function ensurePaymentSettingsCashEnabled(database: Database.Database) {
  const columns = database.prepare("PRAGMA table_info(payment_settings)").all() as Array<{ name: string }>;
  const hasCashEnabled = columns.some((column) => column.name === "cash_enabled");
  if (!hasCashEnabled) {
    database.exec(`ALTER TABLE payment_settings ADD COLUMN cash_enabled integer NOT NULL DEFAULT 1;`);
  }
}

function ensureCatalogActiveColumns(database: Database.Database) {
  const categoryColumns = database.prepare("PRAGMA table_info(categories)").all() as Array<{ name: string }>;
  if (!categoryColumns.some((column) => column.name === "is_active")) {
    database.exec(`ALTER TABLE categories ADD COLUMN is_active integer NOT NULL DEFAULT 1;`);
  }
  const productColumns = database.prepare("PRAGMA table_info(products)").all() as Array<{ name: string }>;
  if (!productColumns.some((column) => column.name === "is_active")) {
    database.exec(`ALTER TABLE products ADD COLUMN is_active integer NOT NULL DEFAULT 1;`);
  }
  const groupColumns = database.prepare("PRAGMA table_info(product_option_groups)").all() as Array<{ name: string }>;
  if (!groupColumns.some((column) => column.name === "is_active")) {
    database.exec(`ALTER TABLE product_option_groups ADD COLUMN is_active integer NOT NULL DEFAULT 1;`);
  }
}

/** Safety net if a SQL file was deployed before it was added to the Drizzle journal. */
function ensurePendingCheckoutsTable(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS pending_checkouts (
      id text PRIMARY KEY NOT NULL,
      viva_order_code text,
      amount_cents integer NOT NULL,
      cart_json text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      order_id integer,
      transaction_id text,
      failure_event_id integer,
      created_at integer NOT NULL,
      expires_at integer NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pending_checkouts_viva_order_code_idx ON pending_checkouts (viva_order_code);
    CREATE INDEX IF NOT EXISTS pending_checkouts_status_idx ON pending_checkouts (status);
  `);
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
    
    const migrationsFolder = resolveMigrationsFolder();
    migrate(db, { migrationsFolder });
    ensurePendingCheckoutsTable(sqlite);
    ensurePaymentSettingsCashEnabled(sqlite);
    ensureCatalogActiveColumns(sqlite);

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