import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import {
  getSessionCookieOptions,
  resolveAdminAccess,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from "@/lib/firebase-session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = typeof body?.idToken === "string" ? body.idToken : "";

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Firebase ID token." },
        { status: 400 }
      );
    }

    const adminAuth = getFirebaseAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const access = await resolveAdminAccess(decodedToken);

    if (!access.isAdmin) {
      return NextResponse.json(
        {
          error:
            "This Firebase user is not allowed to access the admin dashboard. Add the email to FIREBASE_ADMIN_EMAILS, set a custom admin claim, or create a Firestore profiles record with role=admin.",
        },
        { status: 403 }
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionCookie,
      getSessionCookieOptions()
    );

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create Firebase session.";
    const status = message.includes("Cloud Firestore is not initialized")
      ? 503
      : 401;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
