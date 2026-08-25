import type { FactoryRecipe } from "./factory-recipes.ts";

export function isFactoryRecipeAllowed(level: number, recipe: FactoryRecipe) {
  return recipe !== "originium" || level >= 3;
}

export function normalizeFactoryRecipeForLevel(level: number, recipe: FactoryRecipe): FactoryRecipe {
  return isFactoryRecipeAllowed(level, recipe) ? recipe : "gold";
}
