import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function getArgument(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] || null;
}

function requireArgument(flag) {
  const value = getArgument(flag);
  if (!value) {
    throw new Error(`Missing required argument: ${flag}`);
  }

  return value;
}

async function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON.");
  }

  if (raw.trim().startsWith("{")) {
    return JSON.parse(raw);
  }

  const fileContent = await readFile(resolve(raw), "utf8");
  return JSON.parse(fileContent);
}

async function main() {
  const email = requireArgument("--email");
  const password = requireArgument("--password");
  const displayName = getArgument("--name") || "Kabaaya Admin";
  const serviceAccount = await loadServiceAccount();

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        serviceAccount.project_id,
    });
  }

  const auth = getAuth();
  const firestore = getFirestore();

  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, {
      password,
      displayName,
    });
    console.log(`Updated Firebase Auth user: ${email}`);
  } catch {
    userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });
    console.log(`Created Firebase Auth user: ${email}`);
  }

  await auth.setCustomUserClaims(userRecord.uid, {
    admin: true,
    role: "admin",
  });

  await firestore.collection("profiles").doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      email,
      role: "admin",
      displayName,
    },
    { merge: true }
  );

  console.log(`Granted admin access for ${email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
