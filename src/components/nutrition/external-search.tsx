"use client";

import { useState } from "react";
import { importExternalFoodAction, searchOffAction, searchUsdaAction } from "@/lib/actions";
import type { ExternalFood } from "@/lib/food-search";
import { useAction } from "@/components/use-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ExternalSearch({ usdaConfigured }: { usdaConfigured: boolean }) {
  const { pending, error, run } = useAction();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExternalFood[]>([]);
  const [note, setNote] = useState("");

  async function search(kind: "off" | "usda") {
    setNote("");
    const result = kind === "off" ? await searchOffAction(query) : await searchUsdaAction(query);
    if (!result.ok) {
      setResults([]);
      setNote(result.error);
      return;
    }
    setResults(result.data);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a packaged food" className="max-w-sm" />
        <Button type="button" variant="outline" disabled={pending} onClick={() => search("off")}>Open Food Facts</Button>
        <Button type="button" variant="outline" disabled={pending || !usdaConfigured} onClick={() => search("usda")}>USDA</Button>
      </div>
      {!usdaConfigured ? <p className="text-xs text-muted-foreground">USDA search needs a free API key in Settings. Open Food Facts works without one and fails quietly when you are offline.</p> : null}
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-2">
        {results.map((food) => (
          <div key={`${food.source}-${food.name}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
            <span>
              <span className="font-medium">{food.name}</span>
              {food.brand ? ` · ${food.brand}` : ""} · {Math.round(food.calories)} kcal / 100 g · {food.source}
            </span>
            <Button type="button" size="sm" disabled={pending} onClick={() => run(() => importExternalFoodAction(food), "Saved to your foods")}>
              Save
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
