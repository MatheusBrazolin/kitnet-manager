-- CreateTable
CREATE TABLE "TokenRecuperacao" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "TokenRecuperacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenRecuperacao_tokenHash_key" ON "TokenRecuperacao"("tokenHash");

-- CreateIndex
CREATE INDEX "TokenRecuperacao_userId_usadoEm_idx" ON "TokenRecuperacao"("userId", "usadoEm");

-- CreateIndex
CREATE INDEX "TokenRecuperacao_expiraEm_idx" ON "TokenRecuperacao"("expiraEm");

-- AddForeignKey
ALTER TABLE "TokenRecuperacao" ADD CONSTRAINT "TokenRecuperacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

