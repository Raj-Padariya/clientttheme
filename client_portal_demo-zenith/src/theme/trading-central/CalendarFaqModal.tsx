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
        className="relative flex max-h-[90vh] w-full max-w-3xl animate-rise flex-col overflow-hidden rounded-[32px] bg-elevated shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)] ring-1 ring-line-strong motion-reduce:animate-none"
      >
        <header className="flex flex-col gap-4 px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/30 motion-reduce:animate-none" />
              <span className="absolute inset-0 animate-rim-spin [animation-duration:3.5s] motion-reduce:animate-none">
                <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full bg-[var(--zenith-red)]" />
              </span>
              <span className="grid size-10 place-items-center rounded-full bg-fg text-base font-black text-app">?</span>
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="calendar-faq-title" className="truncate text-2xl font-black tracking-tight text-fg">
                {calendarStoryCopy.productSupport}
              </h2>
              <nav aria-label={calendarStoryCopy.productSupport} className="mt-1.5">
                <span aria-current="page" className="inline-flex items-center gap-2 rounded-full bg-fg py-0.5 pr-2.5 pl-1 text-[11px] font-bold text-app">
                  <span className="grid size-5 place-items-center rounded-full bg-[var(--zenith-red)] font-mono text-[10px] text-white tabular-nums">{calendarFaq.length}</span>
                  {calendarStoryCopy.faq}
                </span>
              </nav>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid size-11 shrink-0 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-[color,background-color,box-shadow,rotate] duration-300 hover:rotate-90 hover:bg-[var(--zenith-red)] hover:text-white hover:ring-transparent focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          {/* Pixel index: one cell per question; the open question's cell is red, earlier ones solid. */}
          <span aria-hidden="true" className="flex gap-1">
            {calendarFaq.map((item, index) => (
              <span
                key={item.question}
                className={cx(
                  'h-2 flex-1 rounded-[2px] transition-colors duration-300',
                  openIndex === index ? 'bg-[var(--zenith-red)]' : index < openedCount ? 'bg-fg' : 'bg-fg/12',
                )}
              />
            ))}
          </span>
        </header>

        <ol className="relative flex min-h-0 flex-col gap-2 overflow-y-auto border-t border-line px-4 py-5 sm:px-6">
          {calendarFaq.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `calendar-faq-${index}`;
            return (
              <li key={item.question} style={{ animationDelay: `${index * 40}ms` }} className="animate-feed-in motion-reduce:animate-none">
                <div className={cx('min-w-0 rounded-[24px] ring-1 transition-[box-shadow,background-color] duration-300 motion-reduce:transition-none', isOpen ? 'bg-fg/[0.05] ring-line-strong' : 'bg-fg/[0.02] ring-line hover:ring-line-strong')}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center gap-3 rounded-[24px] py-2 pr-2 pl-2 text-left text-sm font-semibold text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        'relative grid size-9 shrink-0 place-items-center rounded-[12px] font-mono text-xs font-black tabular-nums transition-colors duration-300',
                        isOpen ? 'bg-[var(--zenith-red)] text-white' : 'bg-fg/10 text-fg-muted',
                      )}
                    >
                      {isOpen && <span className="absolute -inset-1 animate-ring-ripple rounded-[14px] border-2 border-[var(--zenith-red)] motion-reduce:hidden" />}
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1">{item.question}</span>
                    <span
                      aria-hidden="true"
                      className={cx('grid size-8 shrink-0 place-items-center rounded-full transition-[rotate,color,background-color] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 bg-fg text-app' : 'text-fg-subtle ring-1 ring-line')}
                    >
                      <Icon name="plus" size={13} />
                    </span>
                  </button>
                  <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                    <div className="overflow-hidden" inert={!isOpen}>
                      <p className="mx-4 mb-4 ml-[3.75rem] border-l-2 border-[var(--zenith-red)] pl-3 text-sm leading-relaxed text-fg-muted">{item.answer}</p>
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
