import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { AdminTokenPayload, AuthTokenPayload, Role, TeamTokenPayload } from './types';

export interface AuthedRequest extends Request {
  auth?: TeamTokenPayload;
}

export interface AdminAuthedRequest extends Request {
  admin?: AdminTokenPayload;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
}

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function signAdminToken(payload: AdminTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '12h' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}

export function requireAuth(request: AuthedRequest, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  if (!token) {
    response.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  try {
    const payload = verifyToken(token);
    if (payload.kind !== 'team') {
      response.status(403).json({ error: 'Team token required' });
      return;
    }
    request.auth = payload;
    next();
  } catch {
    response.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireAdmin(request: AdminAuthedRequest, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  if (!token) {
    response.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  try {
    const payload = verifyToken(token);
    if (payload.kind !== 'admin') {
      response.status(403).json({ error: 'Admin token required' });
      return;
    }
    request.admin = payload;
    next();
  } catch {
    response.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function normalizeTeamName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeRole(value: unknown): Role | null {
  return value === 'solver' || value === 'runner' ? value : null;
}