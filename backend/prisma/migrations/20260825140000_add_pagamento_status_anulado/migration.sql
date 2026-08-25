-- AlterEnum: novo status para parcelas que não vão ser recebidas (ex.: repassadas à
-- imobiliária, morador saiu antes do fim do contrato) — não conta como receita nem como
-- pendência em atraso.
ALTER TYPE "StatusPagamento" ADD VALUE 'ANULADO';
