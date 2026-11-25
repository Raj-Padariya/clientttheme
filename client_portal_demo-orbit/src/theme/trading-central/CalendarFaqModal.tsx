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
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-quick bg-overlay/60 backdrop-blur-[2px] motion-reduce:animate-none" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-faq-title"
        className="relative flex max-h-[90vh] w-full max-w-6xl animate-rise flex-col overflow-hidden rounded-2xl bg-elevated shadow-pop ring-1 ring-primary/30 motion-reduce:animate-none"
      >
        <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-40 -right-40 size-96 animate-orbit-spin motion-reduce:animate-none" />
        <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-24 -right-24 size-64 animate-orbit-spin-rev motion-reduce:animate-none" />
        <header className="relative flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="calendar-faq-title" className="orbit-text text-lg font-semibold">
            {calendarStoryCopy.productSupport}
          </h2>
          <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="relative grid min-h-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="border-b border-line p-3 md:border-r md:border-b-0" aria-label={calendarStoryCopy.productSupport}>
            <span aria-current="page" className="flex items-center gap-2.5 rounded-lg bg-primary-soft px-3 py-2.5 text-sm font-semibold text-primary">
              <span aria-hidden="true" className="grid size-6 animate-pulse place-items-center rounded-full text-xs font-bold ring-[1.5px] ring-current motion-reduce:animate-none">
                ?
              </span>
              {calendarStoryCopy.faq}
            </span>
          </nav>

          <ul className="flex min-h-0 flex-col gap-2.5 overflow-y-auto bg-surface-2 p-4 sm:p-6">
            {calendarFaq.map((item, index) => {
              const isOpen = openIndex === index;
              const panelId = `calendar-faq-${index}`;
              return (
                <li
                  key={item.question}
                  style={{ animationDelay: `${index * 40}ms` }}
                  className={cx('animate-feed-in overflow-hidden rounded-2xl bg-surface ring-1 transition-shadow motion-reduce:animate-none motion-reduce:transition-none', isOpen ? 'shadow-[0_0_24px_-10px_var(--brand-primary)] ring-primary/50' : 'ring-line hover:ring-primary/30')}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-fg transition-colors hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums transition-colors', isOpen ? 'bg-primary text-on-primary shadow-[0_0_12px_var(--brand-primary)]' : 'bg-surface-2 text-fg-subtle ring-1 ring-line')}>
                      {index + 1}
                    </span>
                    <span className="flex-1">{item.question}</span>
                    <Icon name="chevronDown" size={16} className={cx('shrink-0 text-fg-subtle transition-transform duration-300', isOpen && 'rotate-180 text-primary')} />
                  </button>
                  <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                    <div className="overflow-hidden" inert={!isOpen}>
                      <p className="px-4 pb-4 pl-13 text-sm leading-relaxed text-fg-muted">{item.answer}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
