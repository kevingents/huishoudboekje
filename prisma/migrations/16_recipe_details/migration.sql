-- Volwaardige recepten: ingrediënten + bereidingsstappen.
ALTER TABLE "Recipe" ADD COLUMN "ingredients" JSONB;
ALTER TABLE "Recipe" ADD COLUMN "steps" JSONB;
