import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const AUTH_COOKIE = "session_token";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export function signToken(payload: SessionUser): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    return jwt.verify(token, secret) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function authCookieName(): string {
  return AUTH_COOKIE;
}
