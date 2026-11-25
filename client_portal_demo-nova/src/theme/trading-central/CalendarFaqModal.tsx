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

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-quick bg-overlay/70 backdrop-blur-sm motion-reduce:animate-none" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-faq-title"
        className="nova-edge-light relative flex max-h-[90vh] w-full max-w-3xl animate-rise flex-col overflow-hidden rounded-[28px] bg-elevated shadow-[0_40px_80px_-30px_rgb(0_0_0/0.85)] ring-1 ring-line-strong motion-reduce:animate-none"
      >
        <header className="flex items-center gap-4 border-b border-dotted border-line-strong px-6 py-5">
          <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
            <span className="nova-gloss grid size-9 place-items-center rounded-full text-sm font-black text-fg">?</span>
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="calendar-faq-title" className="truncate text-xl font-bold tracking-tight text-fg">
              {calendarStoryCopy.productSupport}
            </h2>
            <nav aria-label={calendarStoryCopy.productSupport} className="mt-1">
              <span aria-current="page" className="inline-flex items-center gap-2 rounded-full bg-fg py-0.5 pr-2.5 pl-1 text-[11px] font-bold text-app">
                <span className="grid size-5 place-items-center rounded-full bg-app font-mono text-[10px] text-fg tabular-nums">{calendarFaq.length}</span>
                {calendarStoryCopy.faq}
              </span>
            </nav>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-[color,box-shadow,rotate] duration-300 hover:rotate-90 hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <ol className="relative flex min-h-0 flex-col gap-2 overflow-y-auto px-4 py-5 sm:px-6">
          {calendarFaq.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `calendar-faq-${index}`;
            const isLast = index === calendarFaq.length - 1;
            return (
              <li key={item.question} style={{ animationDelay: `${index * 40}ms` }} className="relative grid animate-feed-in grid-cols-[2.25rem_minmax(0,1fr)] gap-3 motion-reduce:animate-none">
                {!isLast && <span aria-hidden="true" className="absolute top-10 bottom-[-0.5rem] left-[1.125rem] border-l border-dotted border-line-strong" />}
                <span
                  aria-hidden="true"
                  className={cx(
                    'relative mt-1.5 grid size-9 place-items-center rounded-full font-mono text-xs font-black tabular-nums transition-colors duration-300',
                    isOpen ? 'bg-fg text-app' : 'nova-gloss text-fg-muted',
                  )}
                >
                  {isOpen && <span className="absolute inset-0 animate-ring-ripple rounded-full border border-fg/40 motion-reduce:hidden" />}
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className={cx('min-w-0 rounded-[22px] ring-1 transition-[box-shadow,background-color] duration-300 motion-reduce:transition-none', isOpen ? 'bg-fg/[0.04] ring-line-strong' : 'ring-transparent hover:ring-line')}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center gap-3 rounded-[22px] px-4 py-3.5 text-left text-sm font-semibold text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex-1">{item.question}</span>
                    <span aria-hidden="true" className={cx('grid size-7 shrink-0 place-items-center rounded-full ring-1 transition-[rotate,color,box-shadow] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 text-fg ring-fg/40' : 'text-fg-subtle ring-line')}>
                      <Icon name="plus" size={13} />
                    </span>
                  </button>
                  <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                    <div className="overflow-hidden" inert={!isOpen}>
                      <p className="mx-4 mb-4 border-t border-dotted border-line-strong pt-3 text-sm leading-relaxed text-fg-muted">{item.answer}</p>
                    </div>
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
