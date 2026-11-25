'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { CountryFlag } from '../ui/CountryFlag';
import { Icon, type IconName } from '../ui/Icon';
import { calendarStory, calendarStoryCopy, type InsightPointKind, type RegionInsight } from './calendarStoryteller';
import { StorytellerMark, useTypewriter } from './StorytellerPanel';

const LOADING_DOTS = 12;

const pointIcon: Record<InsightPointKind, IconName> = {
  volatility: 'bolt',
  decision: 'minus',
  notice: 'alert',
  catalyst: 'calendarEdit',
};

/** Loading state: a ring of dots lights up one by one around a glossy bead. */
function GeneratingRings() {
  return (
    <div className="flex flex-col items-center gap-5 py-10" role="status">
      <span className="relative grid size-28 place-items-center" aria-hidden="true">
        {Array.from({ length: LOADING_DOTS }, (_, dot) => {
          const angle = (dot / LOADING_DOTS) * 2 * Math.PI;
          return (
            <span
              key={dot}
              style={{ left: `${50 + 46 * Math.cos(angle)}%`, top: `${50 + 46 * Math.sin(angle)}%`, animationDelay: `${dot * 110}ms` }}
              className="absolute size-2 -translate-1/2 animate-ping-soft rounded-full bg-fg/70 motion-reduce:animate-none"
            />
          );
        })}
        <span className="absolute inset-5 animate-rim-spin rounded-full border border-dashed border-fg/30 motion-reduce:animate-none" />
        <span className="nova-gloss grid size-11 animate-float place-items-center rounded-full text-fg motion-reduce:animate-none">
          <Icon name="bolt" size={16} />
        </span>
      </span>
      <p className="text-sm font-medium text-fg-muted">{calendarStoryCopy.generating}</p>
    </div>
  );
}

function RegionCard({ region, isOpen, onToggle, delayMs }: { region: RegionInsight; isOpen: boolean; onToggle: () => void; delayMs: number }) {
  const panelId = `story-region-${region.id}`;
  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={cx('animate-feed-in overflow-hidden rounded-[24px] ring-1 transition-[background-color,box-shadow] duration-300 motion-reduce:animate-none motion-reduce:transition-none', isOpen ? 'bg-fg/[0.04] ring-line-strong' : 'ring-line hover:ring-line-strong')}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className="group flex w-full items-center gap-3 rounded-[24px] px-3.5 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="relative grid size-11 shrink-0 place-items-center">
          <span aria-hidden="true" className={cx('absolute inset-0 rounded-full border border-dashed transition-colors', isOpen ? 'animate-rim-spin border-fg/40 motion-reduce:animate-none' : 'border-line-strong')} />
          <span className="nova-gloss grid size-8 place-items-center overflow-hidden rounded-full">
            <CountryFlag code={region.country} />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-bold text-fg">{region.title}</span>
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-fg px-2 py-0.5 font-mono font-bold text-app tabular-nums">{region.atr}</span>
            <span className="text-fg-subtle italic">{region.when}</span>
          </span>
        </span>
        <span aria-hidden="true" className={cx('grid size-7 shrink-0 place-items-center rounded-full ring-1 transition-[rotate,color,box-shadow] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 text-fg ring-fg/40' : 'text-fg-subtle ring-line')}>
          <Icon name="plus" size={13} />
        </span>
      </button>
      <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden" inert={!isOpen}>
          <ol className="relative mr-4 mb-4 ml-[34px] flex flex-col gap-4 border-l border-dotted border-line-strong pl-6">
            {region.points.map((point) => (
              <li key={point.title} className="relative flex flex-col gap-1">
                <span className="nova-gloss absolute top-0 -left-[38px] grid size-7 place-items-center rounded-full text-fg">
                  <Icon name={pointIcon[point.kind]} size={12} />
                </span>
                <span className="text-[10.5px] font-bold tracking-[0.14em] text-fg-subtle uppercase">{point.title}</span>
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
  const caret = <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-fg" />;

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
    <div className="fixed inset-0 z-[65] flex justify-end p-0 sm:p-3">
      <button type="button" aria-label="Close Storyteller" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-quick bg-overlay/70 backdrop-blur-sm motion-reduce:animate-none" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-storyteller-title"
        className="nova-edge-light relative flex h-full w-full max-w-md animate-drawer-in flex-col overflow-hidden bg-elevated shadow-[0_40px_80px_-30px_rgb(0_0_0/0.85)] ring-1 ring-line-strong sm:rounded-[28px] motion-reduce:animate-none"
      >
        <header className="relative flex items-center gap-3 border-b border-dotted border-line-strong px-5 py-4">
          <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
            <span className="nova-gloss grid size-8 place-items-center rounded-full">
              <StorytellerMark size={18} />
            </span>
          </span>
          <span className="flex-1 truncate text-lg font-bold tracking-tight text-fg">{calendarStoryCopy.name}</span>
          <div className="relative" onPointerEnter={() => setIsInfoOpen(true)} onPointerLeave={() => setIsInfoOpen(false)}>
            <button
              type="button"
              aria-label="About Storyteller"
              aria-expanded={isInfoOpen}
              onClick={() => setIsInfoOpen((open) => !open)}
              className={cx(
                'grid size-9 place-items-center rounded-full font-serif text-sm font-bold italic ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                isInfoOpen ? 'bg-fg text-app ring-fg' : 'text-fg-muted ring-line hover:text-fg hover:ring-line-strong',
              )}
            >
              i
            </button>
            {isInfoOpen && (
              <p role="tooltip" className="absolute top-full right-0 z-10 mt-2 w-72 animate-rise rounded-[20px] bg-surface p-4 text-xs leading-relaxed text-fg-muted shadow-[0_24px_48px_-20px_rgb(0_0_0/0.8)] ring-1 ring-line-strong motion-reduce:animate-none">
                {calendarStoryCopy.about}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-[color,box-shadow,rotate] duration-300 hover:rotate-90 hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Icon name="close" size={15} />
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5" aria-live="polite" aria-busy={!isDone}>
          {isThinking ? (
            <GeneratingRings />
          ) : (
            <section className="flex flex-col gap-3 rounded-[24px] border border-dashed border-line-strong p-4">
              <h2 id="calendar-storyteller-title" className="text-2xl leading-tight font-bold tracking-[-0.02em] text-fg">
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
                <button type="button" onClick={skip} className="self-start rounded-full px-3.5 py-1.5 text-xs font-semibold text-fg-muted ring-1 ring-line transition-colors hover:bg-fg hover:text-app hover:ring-fg focus-visible:outline-2 focus-visible:outline-ring">
                  Skip typing
                </button>
              )}
            </section>
          )}

          {isDone && (
            <section className="flex flex-col gap-3">
              <h3 className="flex animate-feed-in items-center gap-2.5 text-lg font-bold text-fg motion-reduce:animate-none">
                <span aria-hidden="true" className="flex gap-1">
                  <span className="size-1.5 rounded-full bg-fg" />
                  <span className="size-1.5 rounded-full bg-fg/50" />
                  <span className="size-1.5 rounded-full bg-fg/20" />
                </span>
                {calendarStoryCopy.nextMajorEvent}
              </h3>
              {story.regions.map((region, index) => (
                <RegionCard key={region.id} region={region} isOpen={openRegions.has(region.id)} onToggle={() => toggleRegion(region.id)} delayMs={100 * (index + 1)} />
              ))}
              <p className="animate-feed-in text-xs text-fg-subtle motion-reduce:animate-none">{calendarStoryCopy.atrNote}</p>
            </section>
          )}
        </div>

        <footer className="flex items-start gap-2.5 border-t border-dotted border-line-strong px-5 py-3.5 text-[11px] leading-relaxed text-fg-subtle">
          <span aria-hidden="true" className="nova-gloss grid size-6 shrink-0 place-items-center rounded-full">
            <StorytellerMark size={12} />
          </span>
          <p>{calendarStoryCopy.aiNote}</p>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
