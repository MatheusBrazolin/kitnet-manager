-- CreateTable
CREATE TABLE "Imovel" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Imovel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Imovel" ADD CONSTRAINT "Imovel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (nullable for now, filled by the backfill below)
ALTER TABLE "Kitnet" ADD COLUMN "imovelId" INTEGER;

-- Data backfill: cada Kitnet existente passa a ter seu próprio Imóvel (1 unidade),
-- preservando o cadastro atual. O usuário pode depois renomear o imóvel e/ou mover
-- outras kitnets para dentro dele para agrupá-las (ex.: os 10 quartos de uma kitnet).
INSERT INTO "Imovel" ("nome", "userId", "createdAt", "updatedAt")
SELECT "numero", "userId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Kitnet";

UPDATE "Kitnet" k
SET "imovelId" = i."id"
FROM "Imovel" i
WHERE i."userId" = k."userId" AND i."nome" = k."numero" AND k."imovelId" IS NULL;

-- Now that every row is backfilled, enforce NOT NULL
ALTER TABLE "Kitnet" ALTER COLUMN "imovelId" SET NOT NULL;

-- DropIndex (old uniqueness was per user; now it's per imóvel, since two imóveis
-- do mesmo usuário podem ter unidades com o mesmo número/etiqueta)
DROP INDEX "Kitnet_userId_numero_key";

-- CreateIndex
CREATE UNIQUE INDEX "Kitnet_imovelId_numero_key" ON "Kitnet"("imovelId", "numero");

-- AddForeignKey
ALTER TABLE "Kitnet" ADD CONSTRAINT "Kitnet_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
