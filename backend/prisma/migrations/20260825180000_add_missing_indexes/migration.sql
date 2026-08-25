-- Índices que faltavam nas colunas de filtro mais usadas (userId nas tabelas de topo,
-- kitnetId nas tabelas filhas, status+vencimento em Pagamento) — sem eles, essas consultas
-- fazem sequential scan conforme a base cresce.
CREATE INDEX "Imovel_userId_idx" ON "Imovel"("userId");
CREATE INDEX "Kitnet_userId_idx" ON "Kitnet"("userId");
CREATE INDEX "Morador_kitnetId_idx" ON "Morador"("kitnetId");
CREATE INDEX "Gasto_kitnetId_idx" ON "Gasto"("kitnetId");
CREATE INDEX "Pagamento_status_vencimento_idx" ON "Pagamento"("status", "vencimento");

-- O índice único (moradorId, mesReferencia, tipo) já cobre buscas por moradorId sozinho
-- (é a coluna líder do índice composto) — o índice solo abaixo é redundante e só custa
-- overhead de escrita.
DROP INDEX "Pagamento_moradorId_idx";
