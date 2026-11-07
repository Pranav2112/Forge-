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
});
