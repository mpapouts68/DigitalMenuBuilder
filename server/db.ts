import { createConnection } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// MariaDB connection configuration
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: 'pa0k0l31',
  database: 'olympos',
  port: 3306,
};

let connection: any;
let db: ReturnType<typeof drizzle>;

export async function initializeDatabase() {
  try {
    connection = await createConnection(dbConfig);
    db = drizzle(connection, { schema, mode: 'default' });
    
    // Test the connection
    await connection.execute('SELECT 1');
    console.log('MariaDB connection established successfully');
    
    return { connection, db };
  } catch (error) {
    console.error('Failed to initialize MariaDB database:', error);
    throw new Error(`MariaDB initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Initialize database placeholder - will be set by initializeDatabase()
db = null as any;

// Export for backward compatibility
export { connection as pool, db };