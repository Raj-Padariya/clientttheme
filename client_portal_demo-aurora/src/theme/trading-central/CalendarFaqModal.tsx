'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { calendarFaq, calendarStoryCopy } from './calendarStoryteller';

export function CalendarFaqModal({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const openedCount = openIndex === null ? 0 : openIndex + 1;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-quick bg-overlay/70 backdrop-blur-sm motion-reduce:animate-none" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-faq-title"
        className="relative flex max-h-[90vh] w-full max-w-3xl animate-rise flex-col overflow-hidden rounded-2xl bg-elevated shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] ring-1 ring-line-strong motion-reduce:animate-none"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-(--hero-buy)/30">
          <span className="mkt-sweep absolute inset-y-0 w-24 bg-(--hero-buy)" />
        </span>

        <header className="flex flex-col gap-4 px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
              <span className="grid size-11 place-items-center rounded-lg bg-(--hero-buy) font-mono text-lg font-black text-[#062520]">?</span>
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="calendar-faq-title" className="truncate text-2xl font-black tracking-tight text-fg">
                {calendarStoryCopy.productSupport}
              </h2>
              <nav aria-label={calendarStoryCopy.productSupport} className="mt-1.5">
                <span aria-current="page" className="inline-flex items-center gap-2 rounded-md bg-(--hero-buy)/12 py-0.5 pr-2.5 pl-1 text-[11px] font-bold text-(--hero-buy) ring-1 ring-(--hero-buy)/30">
                  <span className="grid size-5 place-items-center rounded bg-(--aurora-cta-from) font-mono text-[10px] text-[#062520] tabular-nums">{calendarFaq.length}</span>
                  {calendarStoryCopy.faq}
                </span>
              </nav>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid size-11 shrink-0 place-items-center rounded-lg text-fg-muted ring-1 ring-line transition-[color,background-color,box-shadow,rotate] duration-300 hover:rotate-90 hover:bg-(--aurora-cta-from) hover:text-[#062520] hover:ring-transparent focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          {/* Progress tape: one bar per question; read ones print sage, the open one rises clay. */}
          <span aria-hidden="true" className="flex h-4 items-end gap-1">
            {calendarFaq.map((item, index) => (
              <span
                key={item.question}
                className={cx(
                  'flex-1 rounded-t-[2px] transition-[height,background-color] duration-300',
                  openIndex === index ? 'h-full bg-(--aurora-cta-from)' : index < openedCount ? 'h-2/3 bg-(--hero-buy)' : 'h-1/3 bg-fg/12',
                )}
              />
            ))}
          </span>
        </header>

        <ol className="relative flex min-h-0 flex-col overflow-y-auto border-t border-dashed border-line">
          {calendarFaq.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `calendar-faq-${index}`;
            return (
              <li
                key={item.question}
                style={{ animationDelay: `${index * 40}ms` }}
                className={cx('relative animate-feed-in border-b border-dashed border-line transition-colors duration-300 last:border-b-0 motion-reduce:animate-none', isOpen ? 'bg-(--hero-buy)/[0.06]' : 'hover:bg-fg/[0.03]')}
              >
                <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1 transition-colors duration-300', isOpen ? 'bg-(--hero-buy)' : 'bg-transparent')} />
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-6"
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'relative grid size-9 shrink-0 place-items-center rounded-md font-mono text-xs font-black tabular-nums transition-colors duration-300',
                      isOpen ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/[0.06] text-fg-muted',
                    )}
                  >
                    {isOpen && <span className="absolute -inset-1 animate-ring-ripple rounded-[8px] border-2 border-(--hero-buy) motion-reduce:hidden" />}
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1">{item.question}</span>
                  <span
                    aria-hidden="true"
                    className={cx('grid size-8 shrink-0 place-items-center rounded-md transition-[rotate,color,background-color] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 bg-(--aurora-cta-from) text-[#062520]' : 'text-fg-subtle ring-1 ring-line')}
                  >
                    <Icon name="plus" size={13} />
                  </span>
                </button>
                <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <div className="overflow-hidden" inert={!isOpen}>
                    <p className="mr-4 mb-4 ml-[4rem] border-l-2 border-dashed border-(--hero-buy) pl-3 text-sm leading-relaxed text-fg-muted sm:mr-6 sm:ml-[4.5rem]">{item.answer}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>,
    document.body,
  );
}
