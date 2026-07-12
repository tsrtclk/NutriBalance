-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "muscle_group" VARCHAR(20) NOT NULL,
    "equipment" VARCHAR(10) NOT NULL,
    "instructions" TEXT,
    "media_url" VARCHAR(300),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "split_day" VARCHAR(12),
    "notes" TEXT,
    "rpe" INTEGER,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "est_kcal" INTEGER,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workout_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "set_number" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight_kg" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "rest_sec" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercises_muscle_group_idx" ON "exercises"("muscle_group");

-- CreateIndex
CREATE INDEX "exercises_owner_id_idx" ON "exercises"("owner_id");

-- CreateIndex
CREATE INDEX "workouts_user_id_started_at_idx" ON "workouts"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "workout_sets_workout_id_idx" ON "workout_sets"("workout_id");

-- CreateIndex
CREATE INDEX "workout_sets_exercise_id_idx" ON "workout_sets"("exercise_id");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Seed the global exercise library (É6). Fixed UUIDs so the rows are stable
-- across environments; owner_id NULL marks them as library (not user) rows.
INSERT INTO "exercises" ("id", "owner_id", "name", "muscle_group", "equipment", "instructions") VALUES
  ('00000000-e6e6-4000-8000-000000000001', NULL, 'Pompes',                    'chest',     'none', 'Mains largeur épaules, corps gainé, descendre poitrine au sol, pousser.'),
  ('00000000-e6e6-4000-8000-000000000002', NULL, 'Développé couché haltères', 'chest',     'home', 'Allongé, haltères au niveau poitrine, pousser à la verticale.'),
  ('00000000-e6e6-4000-8000-000000000003', NULL, 'Développé couché barre',    'chest',     'gym',  'Barre au niveau poitrine, pieds au sol, pousser en gardant les omoplates serrées.'),
  ('00000000-e6e6-4000-8000-000000000004', NULL, 'Tractions',                 'back',      'home', 'Prise pronation, tirer le menton au-dessus de la barre, descendre contrôlé.'),
  ('00000000-e6e6-4000-8000-000000000005', NULL, 'Rowing haltère un bras',    'back',      'home', 'Buste penché, tirer l''haltère vers la hanche, coude près du corps.'),
  ('00000000-e6e6-4000-8000-000000000006', NULL, 'Tirage vertical poulie',    'back',      'gym',  'Assis, tirer la barre vers le haut de la poitrine, buste légèrement incliné.'),
  ('00000000-e6e6-4000-8000-000000000007', NULL, 'Développé militaire',       'shoulders', 'gym',  'Debout ou assis, pousser la barre au-dessus de la tête sans cambrer.'),
  ('00000000-e6e6-4000-8000-000000000008', NULL, 'Élévations latérales',      'shoulders', 'home', 'Haltères le long du corps, monter les bras à l''horizontale, redescendre lentement.'),
  ('00000000-e6e6-4000-8000-000000000009', NULL, 'Curl biceps haltères',      'biceps',    'home', 'Coudes fixes, monter les haltères en supination, contrôler la descente.'),
  ('00000000-e6e6-4000-8000-00000000000a', NULL, 'Dips sur chaise',           'triceps',   'none', 'Mains sur le bord, descendre les hanches en pliant les coudes, remonter.'),
  ('00000000-e6e6-4000-8000-00000000000b', NULL, 'Extension triceps poulie',  'triceps',   'gym',  'Coudes collés au buste, étendre les avant-bras vers le bas.'),
  ('00000000-e6e6-4000-8000-00000000000c', NULL, 'Squat au poids du corps',   'legs',      'none', 'Pieds largeur épaules, descendre cuisses parallèles, dos droit, remonter.'),
  ('00000000-e6e6-4000-8000-00000000000d', NULL, 'Squat barre',               'legs',      'gym',  'Barre sur trapèzes, descendre sous la parallèle si mobilité, remonter gainé.'),
  ('00000000-e6e6-4000-8000-00000000000e', NULL, 'Fentes marchées',           'legs',      'none', 'Grand pas en avant, genou arrière vers le sol, alterner.'),
  ('00000000-e6e6-4000-8000-00000000000f', NULL, 'Soulevé de terre',          'back',      'gym',  'Barre au sol, dos plat, pousser le sol avec les jambes puis verrouiller les hanches.'),
  ('00000000-e6e6-4000-8000-000000000010', NULL, 'Hip thrust',                'glutes',    'gym',  'Dos sur banc, barre sur les hanches, monter le bassin, contracter en haut.'),
  ('00000000-e6e6-4000-8000-000000000011', NULL, 'Pont fessier',              'glutes',    'none', 'Allongé, pieds au sol, monter le bassin, contracter les fessiers en haut.'),
  ('00000000-e6e6-4000-8000-000000000012', NULL, 'Planche',                   'core',      'none', 'Appui coudes/pointes de pieds, corps aligné, gainage sans creuser le dos.'),
  ('00000000-e6e6-4000-8000-000000000013', NULL, 'Crunch',                    'core',      'none', 'Allongé genoux fléchis, enrouler le buste vers les genoux, redescendre lentement.'),
  ('00000000-e6e6-4000-8000-000000000014', NULL, 'Burpees',                   'full_body', 'none', 'Squat, planche, pompe, saut — enchaîner de façon fluide.')
ON CONFLICT ("id") DO NOTHING;
