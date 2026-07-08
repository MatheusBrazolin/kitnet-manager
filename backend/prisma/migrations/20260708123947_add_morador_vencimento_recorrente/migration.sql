-- AlterTable
ALTER TABLE "Morador" ADD COLUMN     "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "diaVencimento" INTEGER NOT NULL DEFAULT 10;

-- Backfill moradores existentes com base na data de cadastro, em vez do default fixo
UPDATE "Morador" SET "dataEntrada" = "createdAt", "diaVencimento" = EXTRACT(DAY FROM "createdAt")::int;
