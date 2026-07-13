-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "gamification_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" UUID NOT NULL,
    "weight_unit" VARCHAR(2) NOT NULL DEFAULT 'kg',
    "height_unit" VARCHAR(2) NOT NULL DEFAULT 'cm',
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "gamification_streaks" (
    "user_id" UUID NOT NULL,
    "kind" VARCHAR(12) NOT NULL,
    "current_len" INTEGER NOT NULL DEFAULT 0,
    "best_len" INTEGER NOT NULL DEFAULT 0,
    "last_day" DATE,
    "events_total" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_streaks_pkey" PRIMARY KEY ("user_id","kind")
);

-- CreateTable
CREATE TABLE "badge_awards" (
    "user_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "earned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_awards_pkey" PRIMARY KEY ("user_id","code")
);

-- CreateTable
CREATE TABLE "challenge_progress" (
    "user_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL,
    "last_day" DATE,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "challenge_progress_pkey" PRIMARY KEY ("user_id","week_start")
);

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_streaks" ADD CONSTRAINT "gamification_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

