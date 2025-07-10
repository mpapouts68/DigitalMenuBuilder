import { createConnection } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// MariaDB connection configuration for your existing database
const dbConfig = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  user: process.env.MARIADB_USER || 'root',
  password: process.env.MARIADB_PASSWORD || 'pa0k0l31',
  database: process.env.MARIADB_DATABASE || 'olympos',
  port: parseInt(process.env.MARIADB_PORT || '3306'),
  // Connection pool settings
  connectionLimit: 10,
  dateStrings: true,
};

let connection: any;
let db: ReturnType<typeof drizzle>;

export async function initializeDatabase() {
  try {
    console.log(`Attempting to connect to MariaDB at ${dbConfig.host}:${dbConfig.port}...`);
    connection = await createConnection(dbConfig);
    db = drizzle(connection, { schema, mode: 'default' });
    
    // Test the connection with your database
    await connection.execute('SELECT 1');
    console.log('✓ MariaDB olympos database connection established successfully');
    
    return { connection, db };
  } catch (error) {
    console.error('✗ Failed to initialize MariaDB database:', error);
    console.log('📋 See MARIADB_TUNNEL_SETUP.md for connection options');
    throw new Error(`MariaDB initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Initialize database placeholder - will be set by initializeDatabase()
db = null as any;

// Export for backward compatibility
export { connection as pool, db };