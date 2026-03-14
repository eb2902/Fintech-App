/**
 * Tipos TypeScript para la aplicación Fintech-App
 */

// Tipos para cookies seguras
export interface SecureCookieOptions {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  priority?: 'low' | 'medium' | 'high';
}

// Tipo para arrays de cookies seguras
export type SecureCookieArray = SecureCookieOptions[];

// Tipos para autenticación
export interface SecureUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}

export interface SecureAuthResult {
  success: boolean;
  user?: Omit<SecureUser, 'password'>;
  token?: string;
  error?: string;
  code?: string;
}

// Tipos para sesiones
export interface SecureSessionData {
  userId: string;
  email: string;
  userAgent: string;
  ipAddress: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  lastActivity: number;
  fingerprint: string;
}

export interface SecureUserSession {
  id: string;
  userId: string;
  token: string;
  userAgent: string;
  ipAddress: string;
  fingerprint: string;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
  expiresAt: Date;
  loginAttempts: number;
  lockedUntil?: Date;
}

// Tipos para CSRF
export interface SecureCSRFToken {
  token: string;
  timestamp: number;
  sessionId?: string;
}

// Tipos para solicitudes HTTP
export interface SecureRequestInfo {
  userAgent: string;
  ipAddress: string;
  email?: string;
}

// Tipos para respuestas de autenticación
export interface SecureAuthResponse {
  success: boolean;
  message?: string;
  user?: Omit<SecureUser, 'password'>;
  token?: string;
  error?: string;
  code?: string;
}

// Tipos para validación de formularios
export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

// Tipos para intentos de login
export interface LoginAttempt {
  identifier: string;
  count: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}