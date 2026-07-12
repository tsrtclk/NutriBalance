-- CreateTable
CREATE TABLE "hydration_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount_ml" INTEGER NOT NULL,
    "drunk_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hydration_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "dosage" VARCHAR(60) NOT NULL,
    "times" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplement_intakes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "supplement_id" UUID NOT NULL,
    "taken_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplement_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hydration_entries_user_id_drunk_at_idx" ON "hydration_entries"("user_id", "drunk_at");

-- CreateIndex
CREATE INDEX "supplements_user_id_active_idx" ON "supplements"("user_id", "active");

-- CreateIndex
CREATE INDEX "supplement_intakes_user_id_taken_at_idx" ON "supplement_intakes"("user_id", "taken_at");

-- CreateIndex
CREATE INDEX "supplement_intakes_supplement_id_taken_at_idx" ON "supplement_intakes"("supplement_id", "taken_at");

-- AddForeignKey
ALTER TABLE "hydration_entries" ADD CONSTRAINT "hydration_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplements" ADD CONSTRAINT "supplements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_intakes" ADD CONSTRAINT "supplement_intakes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_intakes" ADD CONSTRAINT "supplement_intakes_supplement_id_fkey" FOREIGN KEY ("supplement_id") REFERENCES "supplements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

