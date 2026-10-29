-- Imobiliárias (administradoras) + repasse líquido.
--
-- Contexto: o proprietário não recebe o aluguel cheio — a imobiliária desconta a taxa
-- dela e repassa o resto. Até aqui o sistema só guardava um valor fixo em reais por
-- unidade (`Kitnet.taxaImobiliaria`), sem saber de quem era a taxa nem permitir
-- percentual, e os pagamentos registravam apenas o valor bruto.

-- 1) Tipo de taxa: percentual do aluguel ou valor fixo em reais.
CREATE TYPE "TaxaTipo" AS ENUM ('PERCENTUAL', 'FIXA');

-- 2) A administradora em si.
CREATE TABLE "Imobiliaria" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "contato" TEXT,
    "taxaPadraoTipo" "TaxaTipo" NOT NULL DEFAULT 'PERCENTUAL',
    "taxaPadraoValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Imobiliaria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Imobiliaria_userId_idx" ON "Imobiliaria"("userId");

ALTER TABLE "Imobiliaria" ADD CONSTRAINT "Imobiliaria_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Vínculo da unidade com a administradora.
--
-- SetNull, não Cascade: apagar a administradora jamais pode apagar as unidades do
-- proprietário. (O service bloqueia a exclusão antes disso, com 409.)
ALTER TABLE "Kitnet" ADD COLUMN "imobiliariaId" INTEGER;

CREATE INDEX "Kitnet_imobiliariaId_idx" ON "Kitnet"("imobiliariaId");

ALTER TABLE "Kitnet" ADD CONSTRAINT "Kitnet_imobiliariaId_fkey"
    FOREIGN KEY ("imobiliariaId") REFERENCES "Imobiliaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) Percentual ou fixo por unidade.
--
-- Tudo que já estava gravado em `taxaImobiliaria` era valor absoluto em reais (ver o
-- comentário original da coluna, migration 20260821200000), então FIXA como default
-- preserva exatamente o comportamento atual — nenhum valor muda de significado.
ALTER TABLE "Kitnet" ADD COLUMN "taxaTipo" "TaxaTipo" NOT NULL DEFAULT 'FIXA';

-- 5) Snapshot do repasse no pagamento.
--
-- Nulos enquanto a parcela não foi paga. São gravados no momento de marcar como pago e
-- nunca recalculados: reajustar a taxa hoje não pode reescrever repasses de meses
-- fechados — mesmo princípio de KitnetValorHistorico para o valor do aluguel.
ALTER TABLE "Pagamento" ADD COLUMN "valorTaxa" DOUBLE PRECISION;
ALTER TABLE "Pagamento" ADD COLUMN "valorLiquido" DOUBLE PRECISION;

-- 6) Backfill dos pagamentos já confirmados.
--
-- Não existe histórico de taxa (a coluna sempre foi sobrescrita), então o melhor dado
-- disponível para o passado é a taxa atual da unidade. Como todo registro existente é
-- FIXA, o cálculo aqui é só a subtração; GREATEST/LEAST evitam líquido negativo ou taxa
-- maior que o bruto caso alguém tenha cadastrado uma taxa acima do aluguel.
UPDATE "Pagamento" p
SET "valorTaxa" = LEAST(GREATEST(COALESCE(k."taxaImobiliaria", 0), 0), p."valor"),
    "valorLiquido" = p."valor" - LEAST(GREATEST(COALESCE(k."taxaImobiliaria", 0), 0), p."valor")
FROM "Morador" m
JOIN "Kitnet" k ON k."id" = m."kitnetId"
WHERE p."moradorId" = m."id"
  AND p."status" = 'PAGO'
  AND p."tipo" = 'ALUGUEL';

-- Complementares são valores extras recebidos direto do morador ou de terceiros (multa,
-- taxa de limpeza, acerto), que não passam pela administradora: taxa zero, líquido
-- cheio. Sem esta linha eles ficariam com líquido nulo e sumiriam das somas.
UPDATE "Pagamento"
SET "valorTaxa" = 0,
    "valorLiquido" = "valor"
WHERE "status" = 'PAGO'
  AND "tipo" = 'COMPLEMENTAR';
