export type RankableFood = {
  id: string;
  name: string;
  brand: string;
  aliases?: string;
  preparation: string;
  isFavorite: boolean;
  calories: number;
  proteinG: number;
  servingSize: number;
  servingUnit: string;
};

const QUERY_ALIASES: Record<string, string> = {
  curd: "dahi yogurt",
  dahi: "curd yogurt",
  yogurt: "dahi curd",
  roti: "chapati phulka",
  chapati: "roti phulka",
  phulka: "roti chapati",
  "protein powder": "whey",
  "on whey": "whey gold standard",
  "gold standard": "whey",
  rice: "chawal",
  chawal: "rice",
  dal: "daal",
  daal: "dal",
};

export function rankFoods<T extends RankableFood>(
  foods: T[],
  query: string,
  recentIds: string[] = [],
  frequentIds: string[] = [],
): T[] {
  const raw = query.trim().toLowerCase();
  if (!raw) {
    const rank = new Map<string, number>();
    recentIds.forEach((id, index) => rank.set(id, 300 - index));
    frequentIds.forEach((id, index) => rank.set(id, Math.max(rank.get(id) ?? 0, 200 - index)));
    return [...foods]
      .filter((food) => rank.has(food.id) || food.isFavorite)
      .sort((a, b) => (rank.get(b.id) ?? 0) + (b.isFavorite ? 20 : 0) - ((rank.get(a.id) ?? 0) + (a.isFavorite ? 20 : 0)))
      .slice(0, 8);
  }

  const expanded = `${raw} ${QUERY_ALIASES[raw] ?? ""}`.trim();
  const terms = expanded.split(/\s+/).filter(Boolean);

  const scored = foods
    .map((food) => {
      const name = food.name.toLowerCase();
      const brand = food.brand.toLowerCase();
      const aliases = (food.aliases ?? "").toLowerCase();
      const prep = food.preparation.toLowerCase();
      const haystack = `${name} ${brand} ${aliases} ${prep}`;
      let score = 0;
      if (name === raw || aliases.split(",").some((alias) => alias.trim() === raw)) score += 120;
      if (name.startsWith(raw)) score += 40;
      if (!terms.every((term) => haystack.includes(term))) return { food, score: 0 };
      score += 50;
      if (food.isFavorite) score += 8;
      if (recentIds.includes(food.id)) score += 6;
      if (frequentIds.includes(food.id)) score += 4;
      return { food, score };
    })
    .filter((row) => row.score >= 15)
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name));

  return scored.slice(0, 12).map((row) => row.food);
}
