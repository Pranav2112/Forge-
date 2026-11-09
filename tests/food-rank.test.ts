import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankFoods } from "../src/lib/food-rank";

const foods = [
  { id: "rice", name: "Cooked white rice", brand: "", aliases: "rice, cooked rice, white rice, chawal", preparation: "cooked", isFavorite: false, calories: 130, proteinG: 2.7, servingSize: 100, servingUnit: "g" },
  { id: "dal", name: "Cooked dal", brand: "", aliases: "dal, daal, cooked dal", preparation: "cooked", isFavorite: true, calories: 120, proteinG: 7, servingSize: 100, servingUnit: "g" },
  { id: "whey", name: "Gold Standard 100% Whey", brand: "Optimum Nutrition", aliases: "on whey, gold standard, whey, protein powder", preparation: "dry", isFavorite: true, calories: 120, proteinG: 24, servingSize: 32, servingUnit: "g" },
  { id: "dahi", name: "Amul Masti Dahi", brand: "Amul", aliases: "dahi, curd, yogurt", preparation: "as packaged", isFavorite: false, calories: 75, proteinG: 3, servingSize: 100, servingUnit: "g" },
];

describe("food search", () => {
  it("finds cooked rice and then dal without keeping the old query", () => {
    const rice = rankFoods(foods, "cooked rice");
    assert.equal(rice[0]?.id, "rice");
    assert.equal(rice.some((food) => food.id === "dal"), false);
    const dal = rankFoods(foods, "dal");
    assert.equal(dal[0]?.id, "dal");
  });

  it("matches whey aliases and curd", () => {
    assert.equal(rankFoods(foods, "protein powder")[0]?.id, "whey");
    assert.equal(rankFoods(foods, "on whey")[0]?.id, "whey");
    assert.equal(rankFoods(foods, "curd")[0]?.id, "dahi");
  });

  it("shows favorites when the search is empty", () => {
    const empty = rankFoods(foods, "", ["rice"]);
    assert.equal(empty[0]?.id, "rice");
    assert.ok(empty.some((food) => food.id === "dal"));
  });

  it("matches partial names without requiring the alias words too", () => {
    const catalog = [
      ...foods,
      { id: "brown", name: "Brown rice", brand: "", aliases: "brown rice", preparation: "cooked", isFavorite: false, calories: 123, proteinG: 2.7, servingSize: 100, servingUnit: "g" },
      { id: "poha", name: "Poha", brand: "", aliases: "poha, flattened rice", preparation: "cooked", isFavorite: false, calories: 130, proteinG: 2.5, servingSize: 100, servingUnit: "g" },
      { id: "kanda", name: "Kanda Poha", brand: "", aliases: "kanda poha", preparation: "cooked", isFavorite: false, calories: 150, proteinG: 3, servingSize: 100, servingUnit: "g" },
      { id: "coffee", name: "Coffee", brand: "", aliases: "coffee", preparation: "brewed", isFavorite: false, calories: 2, proteinG: 0.1, servingSize: 240, servingUnit: "ml" },
      { id: "coffee-milk", name: "Coffee with milk", brand: "", aliases: "coffee with milk", preparation: "prepared", isFavorite: true, calories: 40, proteinG: 2, servingSize: 240, servingUnit: "ml" },
    ];
    const riceIds = rankFoods(catalog, "ric").map((food) => food.id);
    assert.ok(riceIds.includes("rice"));
    assert.ok(riceIds.includes("brown"));
    assert.ok(rankFoods(catalog, "rice").some((food) => food.id === "brown"));
    const poh = rankFoods(catalog, "poh").map((food) => food.id);
    assert.ok(poh.includes("poha"));
    assert.ok(poh.includes("kanda"));
    const coffee = rankFoods(catalog, "cof").map((food) => food.id);
    assert.ok(coffee.includes("coffee"));
    assert.ok(coffee.includes("coffee-milk"));
    assert.equal(coffee.includes("rice"), false);
  });

  it("ranks a few hundred foods without a noticeable delay", () => {
    const catalog = Array.from({ length: 400 }, (_, index) => ({
      id: `f${index}`,
      name: index === 12 ? "Cooked white rice" : `Food ${index}`,
      brand: "",
      aliases: "",
      preparation: "",
      isFavorite: false,
      calories: 100,
      proteinG: 5,
      servingSize: 100,
      servingUnit: "g",
    }));
    const started = performance.now();
    const ranked = rankFoods(catalog, "ric");
    const elapsed = performance.now() - started;
    assert.equal(ranked[0]?.id, "f12");
    assert.ok(elapsed < 20, `ranking took ${elapsed.toFixed(1)} ms`);
  });
});
