'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { CountryFlag } from '../ui/CountryFlag';
import { Icon, type IconName } from '../ui/Icon';
import '../promotion/market.css';
import { calendarStory, calendarStoryCopy, type InsightPointKind, type RegionInsight } from './calendarStoryteller';
import { StorytellerMark, useTypewriter } from './StorytellerPanel';

const LOADING_CANDLES = 16;

const pointIcon: Record<InsightPointKind, IconName> = {
  volatility: 'bolt',
  decision: 'minus',
  notice: 'alert',
  catalyst: 'calendarEdit',
};

/** Loading state: a chart printing itself — candles pumping on a dashed baseline while a scan cursor sweeps across. */
function GeneratingRings() {
  return (
    <div className="flex flex-col items-center gap-5 py-10" role="status">
      <span aria-hidden="true" className="relative flex h-28 w-full max-w-xs items-end gap-1 overflow-hidden rounded-lg bg-fg/[0.03] px-3 pb-2 ring-1 ring-line">
        <span className="mkt-march absolute inset-x-3 top-1/2 border-t border-dashed border-(--hero-buy)/50" />
        {Array.from({ length: LOADING_CANDLES }, (_, candle) => (
          <span
            key={candle}
            style={{ height: `${30 + ((candle * 37) % 60)}%`, '--vol-delay': `${(candle % 6) * 0.15}s` } as CSSProperties}
            className={cx('mkt-vol relative flex-1 rounded-t-[2px]', candle % 4 === 3 ? 'bg-(--aurora-cta-from)' : 'bg-(--hero-buy)')}
          />
        ))}
        <span className="mkt-flow absolute inset-y-0 w-px bg-(--hero-buy)/60" />
      </span>
      <span className="grid size-11 animate-float place-items-center rounded-lg bg-(--hero-buy) text-[#062520] motion-reduce:animate-none">
        <Icon name="bolt" size={17} />
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
        'relative animate-feed-in overflow-hidden rounded-lg ring-1 transition-[background-color,box-shadow] duration-300 motion-reduce:animate-none motion-reduce:transition-none',
        isOpen ? 'bg-(--hero-buy)/[0.06] ring-(--hero-buy)/40' : 'bg-fg/[0.02] ring-line hover:ring-line-strong',
      )}
    >
      <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1 transition-colors duration-300', isOpen ? 'bg-(--hero-buy)' : 'bg-transparent')} />
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className="group flex w-full items-center gap-3 px-3 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="relative grid size-11 shrink-0 place-items-center">
          {isOpen && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-lg border-2 border-(--hero-buy)/60 motion-reduce:hidden" />}
          <span className="grid size-9 place-items-center overflow-hidden rounded-md bg-fg/10 ring-1 ring-line transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none">
            <CountryFlag code={region.country} />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-bold text-fg">{region.title}</span>
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cx('rounded px-2 py-0.5 font-mono font-bold tabular-nums transition-colors', isOpen ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/[0.08] text-fg')}>{region.atr}</span>
            <span className="text-fg-subtle italic">{region.when}</span>
          </span>
        </span>
        <span
          aria-hidden="true"
          className={cx('grid size-8 shrink-0 place-items-center rounded-md transition-[rotate,color,background-color] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 bg-(--aurora-cta-from) text-[#062520]' : 'text-fg-subtle ring-1 ring-line')}
        >
          <Icon name="plus" size={13} />
        </span>
      </button>
      <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden" inert={!isOpen}>
          <ol className="mx-3 mb-3 flex flex-col border-t border-dashed border-line">
            {region.points.map((point, index) => (
              <li key={point.title} style={{ animationDelay: `${index * 80}ms` }} className={cx('flex gap-3 border-b border-dashed border-line py-3 last:border-b-0', isOpen && 'animate-feed-in motion-reduce:animate-none')}>
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25">
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
  const caret = <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-[3px] translate-y-[2px] animate-pulse rounded-[1px] bg-(--aurora-cta-from)" />;

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
        className="relative flex h-full w-full max-w-md animate-drawer-in flex-col overflow-hidden bg-elevated shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] ring-1 ring-line-strong sm:rounded-2xl motion-reduce:animate-none"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-(--hero-buy)/30">
          <span className="mkt-sweep absolute inset-y-0 w-24 bg-(--hero-buy)" />
        </span>

        <header className="relative flex items-center gap-3 px-5 pt-5 pb-4">
          <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
            <span className="grid size-10 place-items-center rounded-lg bg-(--hero-buy) text-[#062520]">
              <StorytellerMark size={18} />
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xl font-black tracking-tight text-fg">{calendarStoryCopy.name}</span>
            <span aria-hidden="true" className="mt-1 flex h-2.5 items-end gap-0.5">
              {[40, 75, 55, 100, 65].map((height, bar) => (
                <span key={bar} style={{ height: `${height}%`, '--vol-delay': `${bar * 0.15}s` } as CSSProperties} className="mkt-vol w-1 rounded-t-[1px] bg-(--hero-buy)" />
              ))}
            </span>
          </span>
          <div className="relative" onPointerEnter={() => setIsInfoOpen(true)} onPointerLeave={() => setIsInfoOpen(false)}>
            <button
              type="button"
              aria-label="About Storyteller"
              aria-expanded={isInfoOpen}
              onClick={() => setIsInfoOpen((open) => !open)}
              className={cx(
                'grid size-10 place-items-center rounded-lg font-serif text-sm font-bold italic transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                isInfoOpen ? 'bg-(--hero-buy) text-[#062520]' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
              )}
            >
              i
            </button>
            {isInfoOpen && (
              <p role="tooltip" className="absolute top-full right-0 z-10 mt-2 w-72 animate-rise overflow-hidden rounded-xl bg-surface p-4 text-xs leading-relaxed text-fg-muted shadow-[0_20px_40px_-20px_rgb(0_0_0/0.6)] ring-1 ring-line-strong motion-reduce:animate-none">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-(--hero-buy)" />
                {calendarStoryCopy.about}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-lg text-fg-muted ring-1 ring-line transition-[color,background-color,box-shadow,rotate] duration-300 hover:rotate-90 hover:bg-(--aurora-cta-from) hover:text-[#062520] hover:ring-transparent focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Icon name="close" size={15} />
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto border-t border-dashed border-line px-5 py-5" aria-live="polite" aria-busy={!isDone}>
          {isThinking ? (
            <GeneratingRings />
          ) : (
            <section className="flex flex-col gap-3">
              <h2 id="calendar-storyteller-title" className="text-3xl leading-tight font-black tracking-tight text-fg">
                {typedTitle}
                {isTypingTitle && caret}
              </h2>
              {!isTypingTitle && (
                <p className="relative overflow-hidden rounded-lg bg-fg/[0.03] p-4 pl-5 text-sm leading-relaxed text-fg-muted ring-1 ring-line">
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-(--hero-buy)" />
                  {typedSummary}
                  {!isDone && caret}
                </p>
              )}
              {!isDone && (
                <button
                  type="button"
                  onClick={skip}
                  className="inline-flex items-center gap-2 self-start rounded-md py-1 pr-3.5 pl-1 text-xs font-semibold text-fg-muted ring-1 ring-line transition-colors hover:bg-(--hero-buy)/12 hover:text-(--hero-buy) hover:ring-(--hero-buy)/40 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span aria-hidden="true" className="grid size-6 place-items-center rounded bg-(--aurora-cta-from) text-[#062520]">
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
                <span aria-hidden="true" className="flex h-3.5 items-end gap-0.5">
                  <span className="mkt-blink h-full w-1.5 rounded-[1.5px] bg-(--aurora-cta-from)" />
                  <span className="h-2/3 w-1.5 rounded-[1.5px] bg-(--hero-buy)" />
                  <span className="h-1/3 w-1.5 rounded-[1.5px] bg-fg/25" />
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
          <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-md bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25">
            <StorytellerMark size={12} />
          </span>
          <p>{calendarStoryCopy.aiNote}</p>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
