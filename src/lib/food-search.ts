export type ExternalFood = {
  name: string;
  brand: string;
  servingSize: number;
  servingUnit: string;
  gramsPerServing: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  hasSodium: boolean;
  source: string;
  isEstimate: boolean;
  preparation: string;
  notes: string;
};

type OffProduct = {
  product_name?: string;
  brands?: string;
  code?: string;
  nutriments?: Record<string, number | string | undefined>;
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function mapOffProduct(product: OffProduct): ExternalFood | null {
  const nutriments = product.nutriments ?? {};
  const calories = num(nutriments["energy-kcal_100g"]);
  const proteinG = num(nutriments.proteins_100g);
  const carbsG = num(nutriments.carbohydrates_100g);
  const fatG = num(nutriments.fat_100g);
  if (calories == null || proteinG == null || carbsG == null || fatG == null) return null;
  const name = product.product_name?.trim();
  if (!name) return null;
  const fiber = num(nutriments.fiber_100g);
  const sugar = num(nutriments.sugars_100g);
  const sodium = num(nutriments.sodium_100g);
  const sodiumMg = sodium == null ? 0 : sodium * 1000;
  return {
    name,
    brand: product.brands?.split(",")[0]?.trim() ?? "",
    servingSize: 100,
    servingUnit: "g",
    gramsPerServing: 100,
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG: fiber ?? 0,
    sugarG: sugar ?? 0,
    sodiumMg,
    hasSodium: sodium != null,
    source: `Open Food Facts ${product.code ?? ""}`.trim(),
    isEstimate: false,
    preparation: "as packaged",
    notes: "Imported per 100 g from Open Food Facts. Confirm the package if you eat this often. Missing fiber or sugar was stored as 0 only when the source omitted them.",
  };
}

type UsdaFood = {
  description?: string;
  dataType?: string;
  fdcId?: number;
  foodNutrients?: { nutrientId?: number; value?: number }[];
};

const USDA_IDS = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  fiber: 1079,
  sugar: 2000,
  sodium: 1093,
};

export function mapUsdaFoundationFood(food: UsdaFood): ExternalFood | null {
  if (food.dataType !== "Foundation" && food.dataType !== "SR Legacy") return null;
  const nutrients = new Map<number, number>();
  for (const nutrient of food.foodNutrients ?? []) {
    if (nutrient.nutrientId != null && nutrient.value != null && Number.isFinite(nutrient.value)) {
      nutrients.set(nutrient.nutrientId, nutrient.value);
    }
  }
  const calories = nutrients.get(USDA_IDS.calories);
  const proteinG = nutrients.get(USDA_IDS.protein);
  const carbsG = nutrients.get(USDA_IDS.carbs);
  const fatG = nutrients.get(USDA_IDS.fat);
  if (calories == null || proteinG == null || carbsG == null || fatG == null) return null;
  const name = food.description?.trim();
  if (!name) return null;
  const sodium = nutrients.get(USDA_IDS.sodium);
  return {
    name,
    brand: "",
    servingSize: 100,
    servingUnit: "g",
    gramsPerServing: 100,
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG: nutrients.get(USDA_IDS.fiber) ?? 0,
    sugarG: nutrients.get(USDA_IDS.sugar) ?? 0,
    sodiumMg: sodium ?? 0,
    hasSodium: sodium != null,
    source: `USDA FoodData Central ${food.fdcId ?? ""} (${food.dataType})`.trim(),
    isEstimate: false,
    preparation: "",
    notes: "USDA Foundation or SR Legacy values, treated as per 100 g. Branded USDA records are skipped so a serving size is not guessed.",
  };
}

export async function searchOpenFoodFacts(query: string): Promise<ExternalFood[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "8");
  url.searchParams.set("fields", "product_name,brands,nutriments,code");
  const response = await fetch(url, {
    headers: { "User-Agent": "FORGE-personal-fitness/0.1 (local single user)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Open Food Facts is unavailable.");
  const body = (await response.json()) as { products?: OffProduct[] };
  const foods: ExternalFood[] = [];
  for (const product of body.products ?? []) {
    const mapped = mapOffProduct(product);
    if (mapped) foods.push(mapped);
  }
  return foods;
}

export async function searchUsda(query: string, apiKey: string): Promise<ExternalFood[]> {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "8");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.append("dataType", "Foundation");
  url.searchParams.append("dataType", "SR Legacy");
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("USDA FoodData Central is unavailable.");
  const body = (await response.json()) as { foods?: UsdaFood[] };
  const foods: ExternalFood[] = [];
  for (const food of body.foods ?? []) {
    const mapped = mapUsdaFoundationFood(food);
    if (mapped) foods.push(mapped);
  }
  return foods;
}
