import { LoginForm } from "@/components/auth/login-form";
import { RecoverySession } from "@/components/auth/recovery-session";

export const metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <div className="mx-auto grid w-full max-w-sm gap-6 py-16">
      <RecoverySession />
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">FORGE</p>
        <h1 className="mt-2 text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Private account. Use your email and password.</p>
      </div>
      <LoginForm expired={params.error === "expired"} />
    </div>
  );
}
