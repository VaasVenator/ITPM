import jwt from "jsonwebtoken";
const AUTH_COOKIE = "session_token";
const MAX_SESSION_PROFILE_IMAGE_LENGTH = 512;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  profileImage?: string | null;
};

export function getSafeSessionProfileImage(profileImage: string | null | undefined): string | null {
  if (!profileImage) return null;

  const trimmed = profileImage.trim();
  if (!trimmed) return null;

  // Avoid oversized auth cookies when profile images are stored as data URLs/base64.
  if (trimmed.startsWith("data:") || trimmed.length > MAX_SESSION_PROFILE_IMAGE_LENGTH) {
    return null;
  }

  return trimmed;
}

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

export function getSessionUserFromToken(token: string | null | undefined): SessionUser | null {
  if (!token) return null;
  return verifyToken(token);
}

export function authCookieName(): string {
  return AUTH_COOKIE;
}
