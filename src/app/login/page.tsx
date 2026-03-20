import { LoginPageClient } from "@/components/LoginPageClient";
import { redirectIfAuthenticatedAdmin } from "@/lib/firebase-session";

export default async function LoginPage() {
  await redirectIfAuthenticatedAdmin();
  return <LoginPageClient />;
}
