import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <div className="mx-auto grid max-w-lg gap-4 py-10">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="text-sm text-muted-foreground">
        Only the email in ALLOWED_EMAIL can open this copy. The password is never stored in the app.
      </p>
      <LoginForm />
    </div>
  );
}
