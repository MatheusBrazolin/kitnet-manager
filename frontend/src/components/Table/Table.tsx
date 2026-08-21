import type { CSSProperties, ReactNode } from 'react';
import './table.css';

const MAX_STAGGER_ROWS = 8;

export interface TableColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface TableProps<T> {
  columns: Array<TableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'Nenhum registro encontrado.',
  onRowClick,
}: TableProps<T>) {
  if (rows.length === 0) {
    return <p className="table-empty">{emptyMessage}</p>;
  }

  // No mobile, a tabela vira uma lista de cartões: a 1ª coluna é o título do
  // cartão, colunas com header vazio (normalmente ações) vão pro rodapé sem
  // rótulo, e o resto entra como pares rótulo/valor. Nenhuma página precisa
  // saber disso — é uma segunda representação do mesmo `columns`/`rows`.
  const [titleColumn, ...outrasColumns] = columns;
  const fieldColumns = outrasColumns.filter((column) => column.header !== '');
  const actionColumns = outrasColumns.filter((column) => column.header === '');

  return (
    <div className="table-wrapper">
      <table className="table table-desktop-only">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} style={{ textAlign: column.align ?? 'left' }}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row)}
              className={`animate-in${onRowClick ? ' table-row-clickable' : ''}`}
              style={{ '--stagger': Math.min(index, MAX_STAGGER_ROWS) } as CSSProperties}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
            >
              {columns.map((column) => (
                <td key={column.header} style={{ textAlign: column.align ?? 'left' }}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="table-cards table-mobile-only">
        {rows.map((row, index) => (
          <li
            key={rowKey(row)}
            className={`table-card animate-in${onRowClick ? ' table-card-clickable' : ''}`}
            style={{ '--stagger': Math.min(index, MAX_STAGGER_ROWS) } as CSSProperties}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={
              onRowClick
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }
                : undefined
            }
          >
            <div className="table-card-title">{titleColumn.render(row)}</div>

            {fieldColumns.length > 0 && (
              <dl className="table-card-fields">
                {fieldColumns.map((column) => (
                  <div className="table-card-field" key={column.header}>
                    <dt>{column.header}</dt>
                    <dd>{column.render(row)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {actionColumns.length > 0 && (
              <div className="table-card-actions">
                {actionColumns.map((column, columnIndex) => (
                  <div key={columnIndex}>{column.render(row)}</div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
