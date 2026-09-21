-- 1) Convite de membro passa a exigir aceite.
--
-- Antes, o dono adicionava qualquer e-mail cadastrado e a filiação valia na hora: no
-- login seguinte, o convidado passava a enxergar a conta de quem o convidou e — pior —
-- tudo que ele cadastrasse dali em diante era gravado na conta do outro. Ele também não
-- tinha como sair, porque só o dono podia remover a filiação.
CREATE TYPE "StatusMembro" AS ENUM ('PENDENTE', 'ACEITO');

ALTER TABLE "Membro" ADD COLUMN "status" "StatusMembro" NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE "Membro" ADD COLUMN "aceitoEm" TIMESTAMP(3);

-- As filiações que já existem foram criadas sob o comportamento antigo e estão em uso
-- hoje; marcá-las como PENDENTE tiraria o acesso de quem já trabalha na conta. Só os
-- convites novos nascem pendentes.
UPDATE "Membro" SET "status" = 'ACEITO', "aceitoEm" = "createdAt";

-- 2) Encerrar uma locação sem destruir o histórico.
--
-- Até aqui, a única forma de tirar um morador era DELETE — que cascateia em Pagamento e
-- apaga todo o histórico financeiro dele, mudando retroativamente a receita de meses já
-- fechados. E quem não era excluído continuava recebendo uma parcela nova todo mês, para
-- sempre, mesmo tendo ido embora.
ALTER TABLE "Morador" ADD COLUMN "dataSaida" TIMESTAMP(3);

CREATE INDEX "Morador_kitnetId_dataSaida_idx" ON "Morador"("kitnetId", "dataSaida");
