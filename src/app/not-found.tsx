import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h1 className="text-xl font-semibold">That page is not in FORGE</h1>
      <Link href="/" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
        Back to today
      </Link>
    </div>
  );
}
