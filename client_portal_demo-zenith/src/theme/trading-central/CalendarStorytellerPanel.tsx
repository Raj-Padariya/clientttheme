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

/** Loading state: a ring of square pixels lights up one by one (red head) around a solid bead, plus a scanning pixel row. */
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
              className={cx('absolute size-2.5 -translate-1/2 animate-ping-soft rounded-[3px] motion-reduce:animate-none', dot === 0 ? 'bg-[var(--zenith-red)]' : 'bg-fg/70')}
            />
          );
        })}
        <span className="absolute inset-5 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
        <span className="grid size-12 animate-float place-items-center rounded-full bg-[var(--zenith-red)] text-white motion-reduce:animate-none">
          <Icon name="bolt" size={17} />
        </span>
      </span>
      <span aria-hidden="true" className="flex gap-1">
        {Array.from({ length: 10 }, (_, cell) => (
          <span key={cell} style={{ animationDelay: `${cell * 140}ms` }} className="zenith-twinkle size-2 rounded-[2px] bg-fg/30" />
        ))}
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
      className={cx(
        'animate-feed-in overflow-hidden rounded-[26px] ring-1 transition-[background-color,box-shadow] duration-300 motion-reduce:animate-none motion-reduce:transition-none',
        isOpen ? 'bg-fg/[0.05] ring-line-strong' : 'bg-fg/[0.02] ring-line hover:ring-line-strong',
      )}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className="group flex w-full items-center gap-3 rounded-[26px] px-3 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="relative grid size-12 shrink-0 place-items-center">
          <span
            aria-hidden="true"
            className={cx('absolute inset-0 rounded-[16px] border-2 border-dashed transition-colors', isOpen ? 'animate-rim-spin border-[var(--zenith-red)]/60 motion-reduce:animate-none' : 'border-line-strong')}
          />
          <span className="grid size-9 place-items-center overflow-hidden rounded-[12px] bg-fg/10">
            <CountryFlag code={region.country} />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-bold text-fg">{region.title}</span>
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cx('rounded-full px-2 py-0.5 font-mono font-bold tabular-nums transition-colors', isOpen ? 'bg-[var(--zenith-red)] text-white' : 'bg-fg text-app')}>{region.atr}</span>
            <span className="text-fg-subtle italic">{region.when}</span>
          </span>
        </span>
        <span
          aria-hidden="true"
          className={cx('grid size-8 shrink-0 place-items-center rounded-full transition-[rotate,color,background-color] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 bg-fg text-app' : 'text-fg-subtle ring-1 ring-line')}
        >
          <Icon name="plus" size={13} />
        </span>
      </button>
      <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden" inert={!isOpen}>
          <ol className="mx-3 mb-3 flex flex-col gap-2">
            {region.points.map((point, index) => (
              <li key={point.title} style={{ animationDelay: `${index * 80}ms` }} className={cx('flex gap-3 rounded-[20px] bg-app/40 p-3 ring-1 ring-line', isOpen && 'animate-feed-in motion-reduce:animate-none')}>
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-fg text-app">
                  <Icon name={pointIcon[point.kind]} size={13} />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10.5px] font-bold tracking-[0.14em] text-fg-subtle uppercase">{point.title}</span>
                  <p className="text-sm leading-relaxed text-fg-muted">{point.body}</p>
                </span>
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
  const caret = <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-[3px] translate-y-[2px] animate-pulse rounded-[1px] bg-[var(--zenith-red)]" />;

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
        className="relative flex h-full w-full max-w-md animate-drawer-in flex-col overflow-hidden bg-elevated shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)] ring-1 ring-line-strong sm:rounded-[32px] motion-reduce:animate-none"
      >
        <header className="relative flex items-center gap-3 px-5 pt-5 pb-4">
          <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/30 motion-reduce:animate-none" />
            <span className="absolute inset-0 animate-rim-spin [animation-duration:3.5s] motion-reduce:animate-none">
              <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full bg-[var(--zenith-red)]" />
            </span>
            <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
              <StorytellerMark size={18} />
            </span>
          </span>
          <span className="flex-1 truncate text-xl font-black tracking-tight text-fg">{calendarStoryCopy.name}</span>
          <div className="relative" onPointerEnter={() => setIsInfoOpen(true)} onPointerLeave={() => setIsInfoOpen(false)}>
            <button
              type="button"
              aria-label="About Storyteller"
              aria-expanded={isInfoOpen}
              onClick={() => setIsInfoOpen((open) => !open)}
              className={cx(
                'grid size-10 place-items-center rounded-full font-serif text-sm font-bold italic transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                isInfoOpen ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
              )}
            >
              i
            </button>
            {isInfoOpen && (
              <p role="tooltip" className="absolute top-full right-0 z-10 mt-2 w-72 animate-rise rounded-[22px] bg-surface p-4 text-xs leading-relaxed text-fg-muted shadow-[0_24px_48px_-20px_rgb(0_0_0/0.6)] ring-1 ring-line-strong motion-reduce:animate-none">
                <span aria-hidden="true" className="mb-2 block h-1 w-8 rounded-full bg-[var(--zenith-red)]" />
                {calendarStoryCopy.about}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-[color,background-color,box-shadow,rotate] duration-300 hover:rotate-90 hover:bg-[var(--zenith-red)] hover:text-white hover:ring-transparent focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Icon name="close" size={15} />
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto border-t border-line px-5 py-5" aria-live="polite" aria-busy={!isDone}>
          {isThinking ? (
            <GeneratingRings />
          ) : (
            <section className="flex flex-col gap-3">
              <h2 id="calendar-storyteller-title" className="text-3xl leading-tight font-black tracking-tight text-fg">
                {typedTitle}
                {isTypingTitle && caret}
              </h2>
              {!isTypingTitle && (
                <p className="rounded-[22px] bg-fg/[0.03] p-4 text-sm leading-relaxed text-fg-muted ring-1 ring-line">
                  {typedSummary}
                  {!isDone && caret}
                </p>
              )}
              {!isDone && (
                <button
                  type="button"
                  onClick={skip}
                  className="inline-flex items-center gap-2 self-start rounded-full py-1 pr-3.5 pl-1 text-xs font-semibold text-fg-muted ring-1 ring-line transition-colors hover:bg-fg hover:text-app hover:ring-fg focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-[var(--zenith-red)] text-white">
                    <Icon name="arrowRight" size={11} />
                  </span>
                  Skip typing
                </button>
              )}
            </section>
          )}

          {isDone && (
            <section className="flex flex-col gap-3">
              <h3 className="flex animate-feed-in items-center gap-2.5 text-lg font-black text-fg motion-reduce:animate-none">
                <span aria-hidden="true" className="flex items-end gap-0.5">
                  <span className="h-3 w-1.5 rounded-[1.5px] bg-[var(--zenith-red)]" />
                  <span className="h-2 w-1.5 rounded-[1.5px] bg-fg/50" />
                  <span className="h-1.5 w-1.5 rounded-[1.5px] bg-fg/20" />
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

        <footer className="flex items-start gap-2.5 border-t border-dashed border-line-strong px-5 py-3.5 text-[11px] leading-relaxed text-fg-subtle">
          <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-fg text-app">
            <StorytellerMark size={12} />
          </span>
          <p>{calendarStoryCopy.aiNote}</p>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
