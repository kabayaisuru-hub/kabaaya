import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";

let persistenceReady: Promise<void> | null = null;

export function getClientAuth() {
  return getAuth(getFirebaseApp());
}

async function ensurePersistence() {
  if (!persistenceReady) {
    persistenceReady = setPersistence(getClientAuth(), browserLocalPersistence);
  }

  await persistenceReady;
}

export async function signInWithFirebaseEmail(email: string, password: string) {
  await ensurePersistence();
  return signInWithEmailAndPassword(getClientAuth(), email, password);
}

export async function signOutFromFirebase() {
  return signOut(getClientAuth());
}
