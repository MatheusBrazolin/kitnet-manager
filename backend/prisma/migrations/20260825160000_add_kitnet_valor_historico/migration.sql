-- CreateTable: histórico append-only de valor de aluguel por kitnet.
CREATE TABLE "KitnetValorHistorico" (
    "id" SERIAL NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kitnetId" INTEGER NOT NULL,

    CONSTRAINT "KitnetValorHistorico_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KitnetValorHistorico_kitnetId_idx" ON "KitnetValorHistorico"("kitnetId");

ALTER TABLE "KitnetValorHistorico" ADD CONSTRAINT "KitnetValorHistorico_kitnetId_fkey"
  FOREIGN KEY ("kitnetId") REFERENCES "Kitnet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada kitnet já existente ganha um primeiro registro de histórico com o valor
-- atual, vigente desde a criação da unidade — sem isso, o histórico ficaria vazio até a
-- próxima edição de valor.
INSERT INTO "KitnetValorHistorico" ("valor", "vigenteDesde", "createdAt", "kitnetId")
SELECT "valor", "createdAt", "createdAt", "id" FROM "Kitnet";
