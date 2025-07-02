import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Database connection with error handling
let pool: Pool;
let db: ReturnType<typeof drizzle>;

export async function initializeDatabase() {
  try {
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      // Add production optimizations
      ...(process.env.NODE_ENV === 'production' && {
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      })
    });
    
    db = drizzle({ client: pool, schema });
    
    // Test the connection
    await pool.query('SELECT 1');
    console.log('Database connection established successfully');
    
    return { pool, db };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Initialize database synchronously for backward compatibility
pool = new Pool({ connectionString: process.env.DATABASE_URL });
db = drizzle({ client: pool, schema });

// Export for backward compatibility
export { pool, db };