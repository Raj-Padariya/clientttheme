'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { CountryFlag } from '../ui/CountryFlag';
import { Icon, type IconName } from '../ui/Icon';
import { calendarStory, calendarStoryCopy, type InsightPointKind, type RegionInsight } from './calendarStoryteller';
import { StorytellerMark, useTypewriter } from './StorytellerPanel';

const LOADING_RINGS = ['ring-success', 'ring-danger', 'ring-primary', 'ring-info'];

const pointIcon: Record<InsightPointKind, IconName> = {
  volatility: 'bolt',
  decision: 'minus',
  notice: 'alert',
  catalyst: 'calendarEdit',
};

function GeneratingRings() {
  return (
    <div className="flex flex-col items-center gap-4 py-10" role="status">
      <span className="flex items-end gap-2" aria-hidden="true">
        {LOADING_RINGS.map((ring, index) => (
          <span key={ring} style={{ animationDelay: `${index * 140}ms` }} className={cx('size-4 animate-bounce rounded-full ring-[3px] motion-reduce:animate-none', ring)} />
        ))}
      </span>
      <p className="text-sm text-fg-muted">{calendarStoryCopy.generating}</p>
    </div>
  );
}

function RegionCard({ region, isOpen, onToggle, delayMs }: { region: RegionInsight; isOpen: boolean; onToggle: () => void; delayMs: number }) {
  const panelId = `story-region-${region.id}`;
  return (
    <div style={{ animationDelay: `${delayMs}ms` }} className={cx('animate-feed-in overflow-hidden rounded-xl ring-1 transition-colors motion-reduce:animate-none', isOpen ? 'bg-surface-2 ring-primary/40' : 'bg-surface-2/60 ring-line')}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="mt-0.5 shrink-0">
          <CountryFlag code={region.country} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-sm font-semibold text-fg">{region.title}</span>
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-primary-soft px-2 py-0.5 font-medium tabular-nums text-primary">{region.atr}</span>
            <span className="text-fg-subtle italic">{region.when}</span>
          </span>
        </span>
        <Icon name="chevronDown" size={16} className={cx('mt-1 shrink-0 text-fg-subtle transition-transform duration-300', isOpen && 'rotate-180 text-primary')} />
      </button>
      <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden" inert={!isOpen}>
          <ol className="relative ml-[27px] flex flex-col gap-4 border-l border-line pr-4 pb-4 pl-5">
            {region.points.map((point) => (
              <li key={point.title} className="relative flex flex-col gap-1">
                <span className="absolute top-0 -left-[33px] grid size-6 place-items-center rounded-full bg-elevated text-primary ring-1 ring-line">
                  <Icon name={pointIcon[point.kind]} size={12} />
                </span>
                <span className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">{point.title}</span>
                <p className="text-sm leading-relaxed text-fg-muted">{point.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function CalendarStorytellerPanel({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [openRegions, setOpenRegions] = useState<Set<string>>(() => new Set());
  const story = calendarStory;
  const { typed, isThinking, isDone, skip } = useTypewriter(`${story.title}\n${story.summary}`);
  const typedTitle = story.title.slice(0, typed);
  const typedSummary = typed > story.title.length ? story.summary.slice(0, typed - story.title.length - 1) : '';
  const isTypingTitle = typed < story.title.length;
  const caret = <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-primary" />;

  useEffect(() => {
    closeRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  function toggleRegion(id: string) {
    setOpenRegions((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[65] flex justify-end">
      <button type="button" aria-label="Close Storyteller" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-quick bg-overlay/60 backdrop-blur-[2px] motion-reduce:animate-none" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-storyteller-title"
        className="relative flex h-full w-full max-w-md animate-drawer-in flex-col border-l border-line-strong bg-elevated shadow-pop motion-reduce:animate-none"
      >
        <header className="relative flex items-center gap-2.5 border-b border-line px-5 py-4">
          <StorytellerMark />
          <span className="flex-1 text-base font-semibold text-fg">{calendarStoryCopy.name}</span>
          <div className="relative" onPointerEnter={() => setIsInfoOpen(true)} onPointerLeave={() => setIsInfoOpen(false)}>
            <button
              type="button"
              aria-label="About Storyteller"
              aria-expanded={isInfoOpen}
              onClick={() => setIsInfoOpen((open) => !open)}
              className={cx('grid size-8 place-items-center rounded-full font-serif text-sm font-bold italic transition-colors focus-visible:outline-2 focus-visible:outline-ring', isInfoOpen ? 'bg-primary text-on-primary' : 'text-fg-muted hover:bg-hover hover:text-fg')}
            >
              i
            </button>
            {isInfoOpen && (
              <p role="tooltip" className="absolute top-full right-0 z-10 mt-2 w-72 animate-rise rounded-xl bg-surface p-3.5 text-xs leading-relaxed text-fg-muted shadow-pop ring-1 ring-line-strong motion-reduce:animate-none">
                {calendarStoryCopy.about}
              </p>
            )}
          </div>
          <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring">
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5" aria-live="polite" aria-busy={!isDone}>
          {isThinking ? (
            <GeneratingRings />
          ) : (
            <section className="flex flex-col gap-3">
              <h2 id="calendar-storyteller-title" className="text-2xl leading-tight font-semibold tracking-tight text-fg">
                {typedTitle}
                {isTypingTitle && caret}
              </h2>
              {!isTypingTitle && (
                <p className="text-sm leading-relaxed text-fg-muted">
                  {typedSummary}
                  {!isDone && caret}
                </p>
              )}
              {!isDone && (
                <button type="button" onClick={skip} className="self-start rounded-full px-3 py-1 text-xs font-medium text-fg-subtle ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-ring">
                  Skip typing
                </button>
              )}
            </section>
          )}

          {isDone && (
            <section className="flex flex-col gap-3">
              <h3 className="animate-feed-in text-lg font-semibold text-fg motion-reduce:animate-none">{calendarStoryCopy.nextMajorEvent}</h3>
              {story.regions.map((region, index) => (
                <RegionCard key={region.id} region={region} isOpen={openRegions.has(region.id)} onToggle={() => toggleRegion(region.id)} delayMs={100 * (index + 1)} />
              ))}
              <p className="animate-feed-in text-xs text-fg-subtle motion-reduce:animate-none">{calendarStoryCopy.atrNote}</p>
            </section>
          )}
        </div>

        <footer className="flex items-start gap-2 border-t border-line px-5 py-3 text-[11px] leading-relaxed text-fg-subtle">
          <StorytellerMark size={14} />
          <p>{calendarStoryCopy.aiNote}</p>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
