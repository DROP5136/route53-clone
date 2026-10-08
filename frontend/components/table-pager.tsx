import { Button } from "@/components/button";

export const pageSize = 10;

export function TablePager({
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav className="pager" aria-label="Pagination">
      <Button type="button" onClick={onPrevious} disabled={page <= 1}>
        Previous
      </Button>
      <span className="pager-status">
        Page {page} of {totalPages}
      </span>
      <Button type="button" onClick={onNext} disabled={page >= totalPages}>
        Next
      </Button>
    </nav>
  );
}
