import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, currentPage, totalPages, total, totalItems, onPageChange, pageSize, onPageSizeChange }) {
  const activePage = page ?? currentPage ?? 1;
  const totalCount = total ?? totalItems ?? 0;

  if (totalPages <= 1 && !onPageSizeChange) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, activePage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-dark-800 rounded-lg mt-4">
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-400">
          Page {activePage} of {totalPages} ({totalCount} total)
        </div>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Show</label>
            <select
              value={pageSize || 20}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-dark-700 border border-dark-600 rounded-lg text-sm text-white px-2 py-1 focus:outline-none"
            >
              {[10, 20, 50, 100].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(activePage - 1)}
          disabled={activePage <= 1}
          className="p-2 rounded-lg hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-dark-600">1</button>
            {start > 2 && <span className="px-1 text-gray-500">...</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              p === activePage ? 'bg-primary text-white' : 'hover:bg-dark-600'
            }`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-gray-500">...</span>}
            <button onClick={() => onPageChange(totalPages)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-dark-600">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => onPageChange(activePage + 1)}
          disabled={activePage >= totalPages}
          className="p-2 rounded-lg hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
