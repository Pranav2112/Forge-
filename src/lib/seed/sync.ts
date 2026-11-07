import type { PrismaClient } from "@prisma/client";
import { FOODS, PROTEIN_OATMEAL, type FoodSeed } from "@/lib/seed/catalog";
import { KEY_ALIASES, LIBRARY, MEAL_TEMPLATES } from "@/lib/seed/library";

export const CATALOG_VERSION = 2;

function row(seed: FoodSeed) {
  return {
    name: seed.name,
    brand: seed.brand,
    servingSize: seed.servingSize,
    servingUnit: seed.servingUnit,
    gramsPerServing: seed.gramsPerServing,
    calories: seed.calories,
    proteinG: seed.proteinG,
    carbsG: seed.carbsG,
    fatG: seed.fatG,
    fiberG: seed.fiberG,
    sugarG: seed.sugarG,
    sodiumMg: seed.sodiumMg,
    hasSodium: seed.hasSodium,
    source: seed.source,
    isEstimate: seed.isEstimate,
    preparation: seed.preparation,
    notes: seed.notes,
    aliases: seed.aliases || KEY_ALIASES[seed.key] || "",
    seedKey: seed.key,
    saturatedFatG: seed.saturatedFatG ?? 0,
    cholesterolMg: seed.cholesterolMg ?? 0,
    calciumMg: seed.calciumMg ?? 0,
    ironMg: seed.ironMg ?? 0,
    potassiumMg: seed.potassiumMg ?? 0,
    bcaaG: seed.bcaaG ?? 0,
    fiberLessThan: seed.fiberLessThan ?? false,
    catalogManaged: true,
  };
}

async function upsertFood(prisma: PrismaClient, seed: FoodSeed) {
  const data = row(seed);
  const byKey = await prisma.food.findUnique({ where: { seedKey: seed.key } });
  if (byKey) {
    if (!byKey.catalogManaged && seed.key !== "whey") return;
    await prisma.food.update({
      where: { id: byKey.id },
      data: { ...data, isFavorite: byKey.isFavorite || seed.isFavorite },
    });
    return;
  }
  const byName = await prisma.food.findFirst({ where: { name: seed.name, seedKey: null } });
  if (byName) {
    const keepUserNumbers = seed.key !== "whey" && (byName.calories !== seed.calories || byName.proteinG !== seed.proteinG);
    await prisma.food.update({
      where: { id: byName.id },
      data: keepUserNumbers
        ? { seedKey: seed.key, aliases: data.aliases, catalogManaged: false }
        : { ...data, isFavorite: byName.isFavorite || seed.isFavorite },
    });
    return;
  }
  await prisma.food.create({ data: { ...data, isFavorite: seed.isFavorite } });
}

async function ensureTemplate(
  prisma: PrismaClient,
  template: { name: string; mealType: string; notes: string; items: readonly { key: string; quantity: number; unit: string }[] },
  foods: Map<string, string>,
) {
  const existing = await prisma.savedMeal.findFirst({ where: { name: template.name } });
  if (existing) return;
  const meal = await prisma.savedMeal.create({
    data: { name: template.name, mealType: template.mealType, notes: template.notes },
  });
  await prisma.savedMealItem.createMany({
    data: template.items.map((item) => {
      const foodId = foods.get(item.key);
      if (!foodId) throw new Error(`Missing template food ${item.key}`);
      return { savedMealId: meal.id, foodId, quantity: item.quantity, unit: item.unit };
    }),
  });
}

export async function syncCatalog(prisma: PrismaClient) {
  const settings = await prisma.userSettings.findUnique({ where: { id: "default" } });
  if (!settings || settings.catalogVersion >= CATALOG_VERSION) return;
  for (const seed of [...FOODS, ...LIBRARY]) {
    await upsertFood(prisma, seed);
  }
  const foods = await prisma.food.findMany({ where: { seedKey: { not: null } } });
  const ids = new Map(foods.flatMap((food) => (food.seedKey ? [[food.seedKey, food.id] as const] : [])));
  await ensureTemplate(prisma, { ...PROTEIN_OATMEAL }, ids);
  for (const template of MEAL_TEMPLATES) await ensureTemplate(prisma, template, ids);
  await prisma.userSettings.update({ where: { id: "default" }, data: { catalogVersion: CATALOG_VERSION } });
}
