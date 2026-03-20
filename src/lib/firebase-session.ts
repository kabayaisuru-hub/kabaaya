import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase-admin";

export const SESSION_COOKIE_NAME = "kabaaya_session";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5;

type AdminSource = "claim" | "profile" | "email" | null;

export interface ServerSession {
  isAdmin: boolean;
  role: string | null;
  source: AdminSource;
  user: {
    uid: string;
    email: string | null;
  };
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

function getConfiguredAdminEmails() {
  return (process.env.FIREBASE_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function toFriendlyFirestoreError(error: unknown) {
  if (!(error instanceof Error)) {
    return new Error("Unable to verify Firebase admin access.");
  }

  if (error.message.includes("NOT_FOUND")) {
    return new Error(
      "Cloud Firestore is not initialized for this Firebase project. Create a Firestore database in Firebase Console for the same project and try again."
    );
  }

  return error;
}

async function syncProfileByUid(uid: string, email: string | null, role: string) {
  try {
    await getFirebaseAdminDb()
      .collection("profiles")
      .doc(uid)
      .set(
        {
          uid,
          email,
          role,
        },
        { merge: true }
      );
  } catch (error) {
    throw toFriendlyFirestoreError(error);
  }
}

export async function resolveAdminAccess(decodedToken: DecodedIdToken) {
  const email = normalizeEmail(decodedToken.email);
  const claimRole =
    typeof decodedToken.role === "string"
      ? decodedToken.role
      : decodedToken.admin === true
        ? "admin"
        : null;

  if (claimRole === "admin") {
    await syncProfileByUid(decodedToken.uid, email, "admin");
    return {
      isAdmin: true,
      role: "admin",
      source: "claim" as const,
    };
  }

  if (email && getConfiguredAdminEmails().includes(email)) {
    await syncProfileByUid(decodedToken.uid, email, "admin");
    return {
      isAdmin: true,
      role: "admin",
      source: "email" as const,
    };
  }

  const profilesCollection = getFirebaseAdminDb().collection("profiles");
  let profileSnapshot;

  try {
    profileSnapshot = await profilesCollection.doc(decodedToken.uid).get();
  } catch (error) {
    throw toFriendlyFirestoreError(error);
  }

  if (profileSnapshot.exists && profileSnapshot.data()?.role === "admin") {
    return {
      isAdmin: true,
      role: "admin",
      source: "profile" as const,
    };
  }

  if (email) {
    let emailProfileSnapshot;

    try {
      emailProfileSnapshot = await profilesCollection
        .where("email", "==", email)
        .limit(1)
        .get();
    } catch (error) {
      throw toFriendlyFirestoreError(error);
    }

    if (!emailProfileSnapshot.empty) {
      const profile = emailProfileSnapshot.docs[0].data();
      if (profile.role === "admin") {
        await syncProfileByUid(decodedToken.uid, email, "admin");
        return {
          isAdmin: true,
          role: "admin",
          source: "profile" as const,
        };
      }
    }
  }

  return {
    isAdmin: false,
    role: null,
    source: null,
  };
}

export function getSessionCookieOptions(maxAge = SESSION_DURATION_MS / 1000) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await getFirebaseAdminAuth().verifySessionCookie(
      sessionCookie,
      true
    );
    const access = await resolveAdminAccess(decodedToken);

    return {
      isAdmin: access.isAdmin,
      role: access.role,
      source: access.source,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
      },
    };
  } catch {
    return null;
  }
}

export async function requireAdminSession() {
  const session = await getServerSession();

  if (!session?.isAdmin) {
    redirect("/login");
  }

  return session;
}

export async function redirectIfAuthenticatedAdmin() {
  const session = await getServerSession();

  if (session?.isAdmin) {
    redirect("/dashboard");
  }

  return session;
}
