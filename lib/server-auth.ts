import { cookies } from "next/headers";
import { authCookieName, getSessionUserFromToken, SessionUser } from "@/lib/auth";

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(authCookieName())?.value;
  return getSessionUserFromToken(token);
}
