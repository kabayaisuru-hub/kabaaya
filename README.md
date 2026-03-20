This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Firebase Database Setup

The app now uses Firebase end to end:

- Firebase Auth for login
- Firestore for bookings, tailoring orders, tailoring items, inventory, expenses, and profiles
- Firebase Admin session cookies for server-side route protection

Add these variables to `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_ADMIN_EMAILS=
```

`FIREBASE_ADMIN_EMAILS` is optional, but it is the simplest way to mark which Firebase Auth users can access the admin dashboard during migration. You can also grant an `admin` custom claim or create a Firestore `profiles/{uid}` document with `role: "admin"`.

To create an admin user directly in Firebase Auth and Firestore:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON=/absolute/path/to/service-account.json \
npm run create:firebase-admin -- --email admin@shop.com --password 'strong-password'
```

## Migrating Existing Data

To copy the old Supabase tables into Firestore, provide a Firebase service account and a Supabase service role key, then run:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON=/absolute/path/to/service-account.json \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key \
npm run migrate:firebase
```

The migration script preserves document IDs for these collections:

- `inventory`
- `bookings`
- `expenses`
- `tailoring_orders`
- `tailoring_items`
- `profiles`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
