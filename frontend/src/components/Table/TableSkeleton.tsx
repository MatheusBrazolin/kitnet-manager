import './table-skeleton.css';

interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 3 }: TableSkeletonProps) {
  return (
    <div className="table-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton table-skeleton-row" />
      ))}
    </div>
  );
}
