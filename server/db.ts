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
    // Configure pool with better connection handling
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      maxUses: 7500,
      allowExitOnIdle: false
    });
    
    db = drizzle({ client: pool, schema });
    
    // Test the connection with a simple query
    const result = await pool.query('SELECT 1 as test');
    console.log('Database connection established successfully:', result.rows[0]);
    
    return { pool, db };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export for backward compatibility
export async function getDatabase() {
  if (!pool || !db) {
    await initializeDatabase();
  }
  return { pool, db };
}

export { pool, db };