import { WelcomePageClient } from "@/components/WelcomePageClient";
import { requireAdminSession } from "@/lib/firebase-session";

export default async function WelcomePage() {
  await requireAdminSession();
  return <WelcomePageClient />;
}
