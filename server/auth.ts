import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "./db";
import { adminSecurity } from "@shared/schema";
import { eq } from "drizzle-orm";

type UserRole = "admin" | "printer";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: { username: string; role: UserRole };
    }
  }
}

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// User store (in production, use database)
const users = new Map<string, { username: string; passwordHash: string; role: UserRole }>();

const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const printerUsername = process.env.PRINTER_USERNAME || "printer";
const printerPassword = process.env.PRINTER_PASSWORD || "printer123";

users.set(adminUsername, {
  username: adminUsername,
  passwordHash: bcrypt.hashSync(adminPassword, 10),
  role: "admin",
});
users.set(printerUsername, {
  username: printerUsername,
  passwordHash: bcrypt.hashSync(printerPassword, 10),
  role: "printer",
});

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
const passcodeSchema = z.object({
  passcode: z.string().min(1),
});
const defaultAdminPasscode = process.env.ADMIN_PASSCODE || "1234";

async function getOrInitAdminPasscodeHash(): Promise<string> {
  const [row] = await db.select().from(adminSecurity).where(eq(adminSecurity.id, 1)).limit(1);
  if (row?.passcodeHash) {
    return row.passcodeHash;
  }

  const hash = bcrypt.hashSync(defaultAdminPasscode, 10);
  await db
    .insert(adminSecurity)
    .values({
      id: 1,
      passcodeHash: hash,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: adminSecurity.id,
      set: {
        passcodeHash: hash,
        updatedAt: Date.now(),
      },
    });
  return hash;
}

export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  const hash = await getOrInitAdminPasscodeHash();
  return bcrypt.compareSync(passcode, hash);
}

export async function updateAdminPasscode(newPasscode: string): Promise<void> {
  const hash = bcrypt.hashSync(newPasscode, 10);
  await db
    .insert(adminSecurity)
    .values({
      id: 1,
      passcodeHash: hash,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: adminSecurity.id,
      set: {
        passcodeHash: hash,
        updatedAt: Date.now(),
      },
    });
}

// JWT Authentication middleware
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔐 Auth middleware - Authorization header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 No Bearer token found');
      return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔐 Extracted token:', token.substring(0, 50) + '...');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role?: UserRole };
      const mappedRole = decoded.role || users.get(decoded.username)?.role || "admin";
      req.user = { username: decoded.username, role: mappedRole };
      console.log('🔐 JWT Auth successful:', { username: decoded.username, role: mappedRole });
      next();
    } catch (jwtError) {
      console.log('🔐 JWT verification failed:', jwtError);
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }
  } catch (error) {
    console.error('🔐 Auth middleware error:', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// Login endpoint
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    const user = users.get(username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    console.log('🔑 JWT Login successful:', { username: user.username, role: user.role });
    
    res.json({ 
      message: 'Login successful', 
      user: { username: user.username, role: user.role },
      token: token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    console.error('🔑 Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

export const loginWithPasscode = async (req: Request, res: Response) => {
  try {
    const { passcode } = passcodeSchema.parse(req.body);
    const valid = await verifyAdminPasscode(passcode);
    if (!valid) {
      return res.status(401).json({ message: "Invalid admin passcode" });
    }

    const token = jwt.sign(
      { username: adminUsername, role: "admin" as UserRole },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.json({
      message: "Admin access granted",
      user: { username: adminUsername, role: "admin" as UserRole },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    res.status(500).json({ message: "Passcode login failed" });
  }
};

// Logout endpoint (client-side token removal)
export const logout = async (req: Request, res: Response) => {
  res.json({ message: 'Logout successful' });
};

// Get current user endpoint
export const getCurrentUser = async (req: Request, res: Response) => {
  // This endpoint should be protected by isAuthenticated middleware
  if (req.user) {
    res.json({ username: req.user.username, role: req.user.role });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden - Admin only" });
  }
  next();
};

export const isPrinterOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.user.role !== "printer" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden - Printer/Admin only" });
  }
  next();
};

// Register endpoint (optional - for adding more users)
export const register = async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    if (users.has(username)) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const passwordHash = bcrypt.hashSync(password, 10);
    users.set(username, { username, passwordHash, role: "admin" });
    
    res.json({ message: 'User registered successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    res.status(500).json({ message: 'Registration failed' });
  }
};