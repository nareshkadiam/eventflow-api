import { createRemoteJWKSet, jwtVerify } from 'jose';
import dotenv from 'dotenv';

dotenv.config();

let cachedJWKS = null;

function getJWKS() {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error('SUPABASE_URL must be set to verify JWTst');
  }
  if (!cachedJWKS) {
    cachedJWKS = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  }
  return cachedJWKS;}
export async function verifyJwt(token) {
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });
    return { userId: payload.sub, role: payload.role ?? null, email: payload.email ?? null };
  } catch {
    return null;
  }
}

export function extractBearer(authorization) {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice(7);}