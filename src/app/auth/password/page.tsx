import { PasswordForm } from "@/components/auth/password-form";

export const metadata = { title: "Set password" };

export default function Page() {
  return (
    <div className="mx-auto grid w-full max-w-sm gap-6 py-16">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">FORGE</p>
        <h1 className="mt-2 text-3xl font-semibold">Choose a password</h1>
        <p className="mt-2 text-sm text-muted-foreground">This sets the password on your existing account. It is not stored in the app.</p>
      </div>
      <PasswordForm mode="set" />
    </div>
  );
}
