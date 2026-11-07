"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        FORGE hit an unexpected error. Your database file was not deleted.
      </p>
      <button type="button" className="mt-4 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
