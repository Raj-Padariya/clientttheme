import type { ReactNode } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { EmptyState, Skeleton } from './Feedback';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  caption?: string;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  skeletonRows?: number;
  /** `cards` draws every row as its own floating card; `plain` keeps the compact divided list used inside panels. */
  variant?: 'plain' | 'cards';
}

const ROW_STAGGER_MS = 45;

// Desktop renders a real <table>; below `sm` each row becomes a stacked card so nothing scrolls sideways.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  caption,
  emptyTitle = translate('common.noDataTitle'),
  emptyDescription = translate('common.noDataText'),
  skeletonRows = 4,
  variant = 'plain',
}: DataTableProps<T>) {
  if (loading || !rows) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label={translate('common.loading')}>
        {Array.from({ length: skeletonRows }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const alignClass = (column: Column<T>) => (column.align === 'right' ? 'text-right' : 'text-left');

  const isCards = variant === 'cards';

  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className={cx('w-full min-w-[640px] text-sm', isCards ? 'border-separate border-spacing-y-2' : 'border-collapse')}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            {/* Rows are positioned so decorations in the first cell can span the whole row; cells stay static for that reason. */}
            <tr className="relative">
              {columns.map((column, columnIndex) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cx(
                    'whitespace-nowrap font-semibold uppercase text-fg-subtle',
                    isCards ? 'px-4 pt-2 pb-2 text-[10.5px] tracking-[0.14em] first:pl-5 last:pr-5' : 'px-4 py-3 text-xs tracking-wide first:pl-0 last:pr-0',
                    alignClass(column),
                  )}
                >
                  {columnIndex === 0 && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left animate-grow bg-linear-to-r from-primary/80 via-(--orbit-violet)/40 to-transparent motion-reduce:animate-none"
                    />
                  )}
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cx(!isCards && 'divide-y divide-line')}>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowKey(row)}
                className={cx('group/row relative animate-rise motion-reduce:animate-none', !isCards && 'transition-colors duration-200 hover:bg-primary/[0.04]')}
                style={{ animationDelay: `${rowIndex * ROW_STAGGER_MS}ms` }}
              >
                {columns.map((column, columnIndex) => (
                  <td
                    key={column.key}
                    className={cx(
                      'whitespace-nowrap text-fg',
                      isCards
                        ? 'border-y border-line bg-surface-2/35 px-4 py-3.5 transition-colors duration-300 group-hover/row:border-primary/30 group-hover/row:bg-surface-2/75 first:rounded-l-2xl first:border-l first:pl-5 last:rounded-r-2xl last:border-r last:pr-5'
                        : 'px-4 py-3.5 first:pl-3 last:pr-0',
                      alignClass(column),
                    )}
                  >
                    {columnIndex === 0 && (
                      <>
                        {/* Cyan accent bar growing from the row's centre on hover, with a satellite node riding it. */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-2.5 left-0 w-0.5 scale-y-0 rounded-full bg-linear-to-b from-primary to-(--orbit-violet) shadow-[0_0_12px_var(--brand-primary)] transition-transform duration-300 group-hover/row:scale-y-100 motion-reduce:transition-none"
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute top-1/2 -left-[3px] size-2 -translate-y-1/2 scale-0 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)] transition-transform duration-300 group-hover/row:scale-100 motion-reduce:transition-none"
                        />
                        {/* A light band sweeping across the whole row on hover. */}
                        <span aria-hidden="true" className={cx('pointer-events-none absolute inset-0 overflow-hidden', isCards && 'rounded-2xl')}>
                          <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-primary/12 to-transparent opacity-0 transition-[translate,opacity] duration-700 ease-out group-hover/row:translate-x-[420%] group-hover/row:opacity-100 motion-reduce:hidden" />
                        </span>
                      </>
                    )}
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className={cx('sm:hidden', isCards ? 'flex flex-col gap-3' : 'divide-y divide-line')}>
        {rows.map((row, rowIndex) => (
          <li
            key={rowKey(row)}
            style={{ animationDelay: `${rowIndex * ROW_STAGGER_MS}ms` }}
            className={cx(
              'relative animate-rise motion-reduce:animate-none',
              isCards ? 'overflow-hidden rounded-2xl border border-line bg-surface-2/35 p-4 pl-5 transition-colors duration-300 active:border-primary/40' : 'py-4 first:pt-0 last:pb-0',
            )}
          >
            {isCards && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 [background-image:var(--brand-gradient)] opacity-70" />}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {columns.map((column) => (
                <div key={column.key} className="min-w-0">
                  <dt className="text-[10.5px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{column.header}</dt>
                  <dd className="mt-0.5 truncate text-sm text-fg">{column.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
