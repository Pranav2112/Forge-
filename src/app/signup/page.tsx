import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { activationIsOpen } from "@/lib/activation-status";

export const metadata = { title: "Create account" };

export default async function Page() {
  const open = await activationIsOpen();
  return (
    <div className="mx-auto grid w-full max-w-sm gap-6 py-16">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">FORGE</p>
        <h1 className="mt-2 text-3xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {open
            ? "This activates the existing owner account. It does not create a second one."
            : "Registration is closed. This copy already has its owner account."}
        </p>
      </div>
      {open ? <SignupForm /> : null}
      <Link href="/login" className="text-sm text-primary">Log in</Link>
    </div>
  );
}
