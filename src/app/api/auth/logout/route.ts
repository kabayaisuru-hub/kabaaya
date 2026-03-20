import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/firebase-session";

export async function POST(request: Request) {
  const sessionCookie =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.split("=")[1] || null;

  if (sessionCookie) {
    try {
      const decodedToken = await getFirebaseAdminAuth().verifySessionCookie(
        sessionCookie,
        false
      );
      await getFirebaseAdminAuth().revokeRefreshTokens(decodedToken.sub);
    } catch {
      // Ignore invalid or expired cookies on logout.
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", getSessionCookieOptions(0));
  return response;
}
