import React from 'react';
import './TableControls.css';

export const sortRows = (rows, sortConfig, getValue) =>
  [...rows].sort((left, right) => {
    if (!sortConfig.key) return 0;
    const leftValue = getValue(left, sortConfig.key);
    const rightValue = getValue(right, sortConfig.key);
    const leftNumber = Number(leftValue);
    const rightNumber = Number(rightValue);
    let comparison;
    if (leftValue !== '' && rightValue !== '' && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      comparison = leftNumber - rightNumber;
    } else {
      comparison = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    }
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

export const SortHeader = ({ label, column, sortConfig, onSort, className = '', ariaLabel }) => {
  const active = sortConfig.key === column;
  const nextDirection = active && sortConfig.direction === 'asc' ? 'desc' : 'asc';
  return (
    <th className={className} scope="col" aria-sort={active ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        className={`table-sort-button ${active ? 'active' : ''}`}
        onClick={() => onSort(column)}
        aria-label={`Sort ${ariaLabel || (typeof label === 'string' ? label : column)} ${nextDirection}`}
      >
        <span>{label}</span>
        <span className={`table-sort-arrows ${active ? `sort-${sortConfig.direction}` : ''}`} aria-hidden="true">
          <svg viewBox="0 0 10 18" focusable="false">
            <path className="sort-arrow-up" d="M2 7l3-3 3 3M5 4v5" />
            <path className="sort-arrow-down" d="M2 11l3 3 3-3M5 14V9" />
          </svg>
        </span>
      </button>
    </th>
  );
};

export const useTableSort = (initialKey = '') => {
  const [sortConfig, setSortConfig] = React.useState({ key: initialKey, direction: 'asc' });
  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  return [sortConfig, handleSort];
};

const TablePagination = ({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items',
}) => {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((number) => number >= 1 && number <= pageCount)
    .sort((a, b) => a - b);

  return (
    <div className="table-pagination">
      <p className="table-pagination-summary">{first}-{last} of {total} {itemLabel}</p>
      <nav className="table-pagination-controls" aria-label={`${itemLabel} pagination`}>
        <button type="button" className="table-pagination-direction" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</button>
        {pages.map((number, index) => (
          <React.Fragment key={number}>
            {index > 0 && number - pages[index - 1] > 1 && <span className="table-pagination-ellipsis">…</span>}
            <button type="button" className={`table-pagination-page ${page === number ? 'active' : ''}`} aria-label={`Go to page ${number}`} aria-current={page === number ? 'page' : undefined} onClick={() => onPageChange(number)}>{number}</button>
          </React.Fragment>
        ))}
        <button type="button" className="table-pagination-direction" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>›</button>
        {onPageSizeChange && (
          <label className="table-page-size">
            <select value={pageSize} aria-label={`Rows per page of ${itemLabel}`} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
              {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        )}
      </nav>
    </div>
  );
};

export default TablePagination;
