interface PaginationProps {
  page: number; // 1-based
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function pageWindow(page: number, pageCount: number, size = 5): number[] {
  const start = Math.max(1, Math.min(page - Math.floor(size / 2), pageCount - size + 1));
  const end = Math.min(pageCount, start + size - 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="ui-pagination">
      <span className="ui-pagination__info">
        Menampilkan {from}–{to} dari {total}
      </span>
      <div className="ui-pagination__controls">
        {pageWindow(page, pageCount).map((p) => (
          <button
            key={p}
            type="button"
            className={p === page ? "ui-pagination__page is-active" : "ui-pagination__page"}
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <select
          className="ui-select"
          value={pageSize}
          aria-label="Jumlah baris per halaman"
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>
              {s}/page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
