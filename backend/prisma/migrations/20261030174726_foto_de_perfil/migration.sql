-- CreateTable
CREATE TABLE "UsuarioFoto" (
    "userId" INTEGER NOT NULL,
    "dados" BYTEA NOT NULL,
    "tipo" TEXT NOT NULL,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsuarioFoto_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UsuarioFoto" ADD CONSTRAINT "UsuarioFoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

