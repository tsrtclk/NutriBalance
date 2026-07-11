-- CreateTable
CREATE TABLE "food_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" VARCHAR(10) NOT NULL,
    "off_barcode" VARCHAR(40),
    "owner_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(120),
    "kcal_per_100g" DECIMAL(7,2) NOT NULL,
    "protein_per_100g" DECIMAL(6,2) NOT NULL,
    "carbs_per_100g" DECIMAL(6,2) NOT NULL,
    "fat_per_100g" DECIMAL(6,2) NOT NULL,
    "serving_size_g" DECIMAL(6,1),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "food_item_id" UUID NOT NULL,
    "meal" VARCHAR(12) NOT NULL,
    "quantity_g" DECIMAL(7,1) NOT NULL,
    "eaten_on" DATE NOT NULL,
    "kcal" DECIMAL(8,2) NOT NULL,
    "protein_g" DECIMAL(7,2) NOT NULL,
    "carbs_g" DECIMAL(7,2) NOT NULL,
    "fat_g" DECIMAL(7,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_foods" (
    "user_id" UUID NOT NULL,
    "food_item_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_foods_pkey" PRIMARY KEY ("user_id","food_item_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "food_items_off_barcode_key" ON "food_items"("off_barcode");

-- CreateIndex
CREATE INDEX "food_items_owner_id_idx" ON "food_items"("owner_id");

-- CreateIndex
CREATE INDEX "food_items_name_idx" ON "food_items"("name");

-- CreateIndex
CREATE INDEX "journal_entries_user_id_eaten_on_idx" ON "journal_entries"("user_id", "eaten_on");

-- AddForeignKey
ALTER TABLE "food_items" ADD CONSTRAINT "food_items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_foods" ADD CONSTRAINT "favorite_foods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_foods" ADD CONSTRAINT "favorite_foods_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

