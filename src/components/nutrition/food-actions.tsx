"use client";

import { deleteFoodAction, toggleFavoriteAction } from "@/lib/actions";
import { useAction } from "@/components/use-action";
import { Button } from "@/components/ui/button";

export function FoodActions({ id, favorite }: { id: string; favorite: boolean }) {
  const { pending, run } = useAction();
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => toggleFavoriteAction(id))}>
        {favorite ? "Unfavorite" : "Favorite"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Delete this food? Saved meals that use it will block the delete. Logged meals keep their snapshots.")) {
            return;
          }
          run(() => deleteFoodAction(id), "Food deleted");
        }}
      >
        Delete
      </Button>
    </div>
  );
}
