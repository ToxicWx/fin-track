ALTER TABLE "transactions"
ADD COLUMN "external_id" TEXT;

CREATE UNIQUE INDEX "transactions_external_id_key"
ON "transactions"("external_id");
