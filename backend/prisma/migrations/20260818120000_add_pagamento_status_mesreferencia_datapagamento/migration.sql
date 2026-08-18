-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO');

-- AlterTable: adiciona as colunas novas ainda opcionais (mesReferencia/status precisam de
-- backfill antes de virarem NOT NULL; dataPagamento/formaPagamento ficam sempre nullable).
ALTER TABLE "Pagamento"
  ADD COLUMN "mesReferencia" TIMESTAMP(3),
  ADD COLUMN "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN "dataPagamento" TIMESTAMP(3),
  ADD COLUMN "formaPagamento" TEXT;

-- Backfill dos registros existentes:
--  - mesReferencia = mês de competência derivado do vencimento (dia 1, UTC).
--  - status: PAGO se já estava marcado como pago; ATRASADO se venceu e nunca foi pago;
--    senão PENDENTE.
--  - dataPagamento: aproximada por updatedAt para quem já estava pago — é a melhor
--    informação disponível, mas não é necessariamente a data real em que o valor foi
--    recebido (essa informação não existia no modelo anterior).
UPDATE "Pagamento" SET
  "mesReferencia" = date_trunc('month', "vencimento"),
  "status" = CASE
    WHEN "pago" THEN 'PAGO'::"StatusPagamento"
    WHEN "vencimento" < now() THEN 'ATRASADO'::"StatusPagamento"
    ELSE 'PENDENTE'::"StatusPagamento"
  END,
  "dataPagamento" = CASE WHEN "pago" THEN "updatedAt" ELSE NULL END;

-- Defensivo: se algum morador já tiver mais de um pagamento no mesmo mês de competência
-- (não deveria acontecer, mas nada impedia isso no modelo antigo), mantém o mais relevante
-- (pago primeiro, senão o de menor id) e remove os demais antes de criar a unique constraint.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "moradorId", "mesReferencia"
      ORDER BY "pago" DESC, "id" ASC
    ) AS rn
  FROM "Pagamento"
)
DELETE FROM "Pagamento" p
USING ranked r
WHERE p."id" = r."id" AND r.rn > 1;

-- Agora que todo registro tem mesReferencia preenchida e não há duplicatas por mês, a
-- coluna pode virar NOT NULL e a unique constraint pode ser aplicada com segurança.
ALTER TABLE "Pagamento" ALTER COLUMN "mesReferencia" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_moradorId_mesReferencia_key" ON "Pagamento"("moradorId", "mesReferencia");
CREATE INDEX "Pagamento_moradorId_idx" ON "Pagamento"("moradorId");

-- AlterTable: a coluna "pago" é substituída por "status" em todo o código.
ALTER TABLE "Pagamento" DROP COLUMN "pago";
