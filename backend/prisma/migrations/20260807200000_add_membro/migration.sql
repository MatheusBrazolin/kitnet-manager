-- CreateEnum
CREATE TYPE "PapelMembro" AS ENUM ('GERENTE', 'VISUALIZADOR');

-- CreateTable
CREATE TABLE "Membro" (
    "id" SERIAL NOT NULL,
    "papel" "PapelMembro" NOT NULL DEFAULT 'GERENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "donoId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Membro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Membro_userId_key" ON "Membro"("userId");

-- AddForeignKey
ALTER TABLE "Membro" ADD CONSTRAINT "Membro_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membro" ADD CONSTRAINT "Membro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
