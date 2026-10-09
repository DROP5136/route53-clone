import { Button } from "@/components/button";

export const pageSize = 10;

export function TablePager({
  page,
  totalPages,
  totalItems,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <nav className="pager" aria-label="Pagination">
      <span className="pager-range">
        {start}–{end} of {totalItems}
      </span>
      <div className="pager-controls">
        <Button type="button" onClick={onPrevious} disabled={page <= 1}>
          Previous
        </Button>
        <span className="pager-status">
          {page} of {totalPages}
        </span>
        <Button type="button" onClick={onNext} disabled={page >= totalPages}>
          Next
        </Button>
      </div>
    </nav>
  );
}
