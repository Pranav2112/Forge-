-- Run this in the Supabase SQL editor before the project is reachable.
-- It turns on row level security and adds no policies, so the public
-- Supabase API cannot read or write these tables.
-- Prisma uses the database owner connection and still works.
-- Do not put the service-role key in NEXT_PUBLIC_ variables.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'UserProfile','UserSettings','NutritionTarget','Goal','Food','Recipe','RecipeIngredient',
    'SavedMeal','SavedMealItem','MealEntry','MealItem','Exercise','TrainingPlan','TrainingPlanDay',
    'PlannedExercise','WorkoutSession','WorkoutExercise','ExerciseSet','CardioSession',
    'HyroxSession','HyroxSegment','BodyWeightEntry','BodyMeasurement','ProgressPhoto',
    'WaterEntry','StepEntry','ImportLog'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
  END LOOP;
END $$;
