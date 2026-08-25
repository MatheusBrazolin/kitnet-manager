-- CreateEnum
CREATE TYPE "TipoPagamento" AS ENUM ('ALUGUEL', 'COMPLEMENTAR');

-- AlterTable: registros existentes viram tipo ALUGUEL (comportamento atual, sem mudança
-- de sentido); origem/observacao ficam sempre opcionais.
ALTER TABLE "Pagamento"
  ADD COLUMN "tipo" "TipoPagamento" NOT NULL DEFAULT 'ALUGUEL',
  ADD COLUMN "origem" TEXT,
  ADD COLUMN "observacao" TEXT;

-- A unique constraint antiga trancava 1 pagamento por morador por mês. Agora ela passa a
-- valer por (morador, mês, tipo), permitindo um lançamento COMPLEMENTAR conviver com a
-- parcela de ALUGUEL do mesmo mês.
DROP INDEX "Pagamento_moradorId_mesReferencia_key";
CREATE UNIQUE INDEX "Pagamento_moradorId_mesReferencia_tipo_key" ON "Pagamento"("moradorId", "mesReferencia", "tipo");
