-- AlterTable: parte do valor do aluguel retida pela imobiliária, quando a unidade é
-- alugada por intermediação dela. Nullable — a maioria das kitnets não tem imobiliária.
ALTER TABLE "Kitnet" ADD COLUMN "taxaImobiliaria" DOUBLE PRECISION;
