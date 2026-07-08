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

  return (
    <div className="table-wrapper">
      <table className="table">
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
    </div>
  );
}
