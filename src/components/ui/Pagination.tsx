"use client";

import React from "react";

export function getPageNumbers(
  currentPage: number,
  totalPages: number
): (number | "...")[] {
  const siblingCount = 1;
  const totalNumbers = siblingCount * 2 + 5; // first, last, current, 2 siblings, 2 ellipses

  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  const pages: (number | "...")[] = [1];

  if (showLeftEllipsis) {
    pages.push("...");
  } else {
    for (let page = 2; page < leftSibling; page++) pages.push(page);
  }

  for (let page = leftSibling; page <= rightSibling; page++) {
    if (page !== 1 && page !== totalPages) pages.push(page);
  }

  if (showRightEllipsis) {
    pages.push("...");
  } else {
    for (let page = rightSibling + 1; page < totalPages; page++)
      pages.push(page);
  }

  pages.push(totalPages);

  return pages;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
  className?: string;
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  itemLabel,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  isLoading = false,
  className = "",
}: PaginationProps) {
  const pages = getPageNumbers(page, Math.max(totalPages, 1));

  return (
    <div
      className={`flex flex-col gap-3 border-t border-line bg-panel2 px-7 py-3.5 font-mono text-[11.5px] text-faint sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-center gap-3">
        <span>
          {totalItems} {itemLabel} · página {page} de {Math.max(totalPages, 1)}
        </span>
        {onPageSizeChange && pageSizeOptions && pageSizeOptions.length > 0 && (
          <label className="flex items-center gap-1.5">
            <span>por página</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-[8px] border border-line bg-panel px-1.5 py-1 text-[12px] text-fg2 focus:outline-none focus:border-accent"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[12px]">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="rounded-[8px] border border-line px-2.5 py-1.5 font-semibold text-fg2 transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:border-line disabled:text-faint disabled:hover:border-line"
        >
          Anterior
        </button>

        {pages.map((p, index) =>
          p === "..." ? (
            <span key={`ellipsis-${index}`} className="px-1.5 text-faint">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              disabled={isLoading}
              aria-current={p === page ? "page" : undefined}
              className={`min-w-[30px] rounded-[8px] px-2.5 py-1.5 font-semibold transition-colors ${
                p === page
                  ? "bg-accent text-accentFg"
                  : "border border-line text-fg2 hover:border-accent/40"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="rounded-[8px] border border-line px-2.5 py-1.5 font-semibold text-fg2 transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:border-line disabled:text-faint disabled:hover:border-line"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
