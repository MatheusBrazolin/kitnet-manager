import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Paginação é opt-in: sem `page`/`limit` na querystring, os endpoints continuam
// devolvendo o array completo (comportamento atual, usado por outras telas que
// precisam da lista inteira, ex.: o seletor de morador em Novo pagamento).
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function isPaginationRequested(pagination: PaginationQueryDto): boolean {
  return pagination.page !== undefined || pagination.limit !== undefined;
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  pagination: PaginationQueryDto,
): PaginatedResult<T> {
  const limit = pagination.limit ?? 20;
  const page = pagination.page ?? 1;
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
