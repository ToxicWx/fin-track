-- AlterTable
ALTER TABLE "asset_credentials" ADD COLUMN     "encrypted_secret" TEXT,
ADD COLUMN     "secret_iv" TEXT;
