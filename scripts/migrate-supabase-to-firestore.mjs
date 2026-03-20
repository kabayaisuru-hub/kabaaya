import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const COLLECTIONS = [
  "inventory",
  "bookings",
  "expenses",
  "tailoring_orders",
  "tailoring_items",
  "profiles",
];

function requireEnv(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function loadServiceAccount() {
  const raw = requireEnv("FIREBASE_SERVICE_ACCOUNT_JSON");

  if (raw.trim().startsWith("{")) {
    return JSON.parse(raw);
  }

  const fileContent = await readFile(resolve(raw), "utf8");
  return JSON.parse(fileContent);
}

function stripUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}

async function fetchSupabasePage({ table, supabaseUrl, supabaseKey, limit, offset }) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?select=*&limit=${limit}&offset=${offset}`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to read ${table} from Supabase: ${response.status} ${body}`);
  }

  return response.json();
}

async function fetchAllRows({ table, supabaseUrl, supabaseKey }) {
  const pageSize = 1000;
  const rows = [];
  let offset = 0;

  while (true) {
    const page = await fetchSupabasePage({
      table,
      supabaseUrl,
      supabaseKey,
      limit: pageSize,
      offset,
    });
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

async function writeCollection(firestore, table, rows) {
  if (rows.length === 0) {
    console.log(`- ${table}: no rows found`);
    return;
  }

  for (let index = 0; index < rows.length; index += 400) {
    const batch = firestore.batch();
    const chunk = rows.slice(index, index + 400);

    chunk.forEach((row) => {
      const docId = String(row.id);
      const docRef = firestore.collection(table).doc(docId);
      const { id, ...rest } = row;
      batch.set(docRef, stripUndefined(rest));
    });

    await batch.commit();
  }

  console.log(`- ${table}: migrated ${rows.length} document(s)`);
}

async function main() {
  const serviceAccount = await loadServiceAccount();
  const firebaseProjectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.project_id;
  const supabaseUrl = requireEnv(
    "SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseProjectId,
    });
  }

  const firestore = getFirestore();

  console.log("Starting Supabase -> Firestore migration");
  console.log(`Firebase project: ${firebaseProjectId}`);

  for (const table of COLLECTIONS) {
    const rows = await fetchAllRows({ table, supabaseUrl, supabaseKey });
    await writeCollection(firestore, table, rows);
  }

  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
