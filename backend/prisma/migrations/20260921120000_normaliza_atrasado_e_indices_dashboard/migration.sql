-- 1) Normaliza os registros legados com status = 'ATRASADO'.
--
-- A migration 20260818120000 fez um backfill gravando 'ATRASADO' no banco. Só que o
-- código atual nunca grava esse status: "atrasado" é derivado na leitura
-- (PagamentosService.comStatusEfetivo), que só reescreve registros PENDENTE. Resultado:
-- nenhuma query do backend filtra por 'ATRASADO', então essas linhas apareciam na lista
-- de pagamentos como atrasadas mas sumiam do "Total em atraso" do dashboard, dos alertas
-- da campainha e dos próximos vencimentos. A dívida existia na tela e valia R$ 0,00 nos
-- totais.
--
-- PENDENTE é o estado correto: o vencimento já passou, então a leitura vai continuar
-- exibindo essas parcelas como atrasadas — agora contando nos totais também.
UPDATE "Pagamento" SET "status" = 'PENDENTE' WHERE "status" = 'ATRASADO';

-- 2) Índices que faltavam para as duas queries mais quentes do dashboard.
--
-- A receita do mês filtra por status PAGO + faixa de "dataPagamento" (e o histórico de 6
-- meses, idem) — nenhuma das duas usa "vencimento", então o índice [status, vencimento]
-- que já existia não as atendia. Gastos são sempre recortados por faixa de "data" dentro
-- de uma kitnet, e o índice solo de "kitnetId" não cobre esse segundo termo.
CREATE INDEX "Pagamento_status_dataPagamento_idx" ON "Pagamento"("status", "dataPagamento");
CREATE INDEX "Gasto_kitnetId_data_idx" ON "Gasto"("kitnetId", "data");
