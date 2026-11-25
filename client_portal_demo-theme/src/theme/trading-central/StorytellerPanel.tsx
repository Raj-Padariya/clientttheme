'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { storytellerCopy, type PerformanceDirection, type StorytellerStory } from './technicalViews';

const THINKING_MS = 900;
const CHARS_PER_TICK = 2;
const TICK_MS = 18;

type SectionId = 'strategy' | 'insights' | 'multiTimeframe';

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Reveals `text` a few characters at a time after a short "thinking" pause, like a model streaming its answer. */
export function useTypewriter(text: string) {
  const [typed, setTyped] = useState(() => (prefersReducedMotion() ? text.length : 0));
  const [isThinking, setIsThinking] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (typed >= text.length) return;
    if (isThinking) {
      const pause = setTimeout(() => setIsThinking(false), THINKING_MS);
      return () => clearTimeout(pause);
    }
    const tick = setTimeout(() => setTyped((count) => Math.min(text.length, count + CHARS_PER_TICK)), TICK_MS);
    return () => clearTimeout(tick);
  }, [typed, text.length, isThinking]);

  return { typed, isThinking, isDone: typed >= text.length, skip: () => setTyped(text.length) };
}

export function StorytellerMark({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-[30%] bg-[conic-gradient(from_200deg,var(--brand-primary),var(--color-info),var(--color-success),var(--brand-primary))] p-[3px]"
    >
      <span className="size-full rounded-[25%] bg-elevated" />
    </span>
  );
}

const performanceTone: Record<PerformanceDirection, { icon: IconName; className: string }> = {
  up: { icon: 'trendUp', className: 'text-success' },
  down: { icon: 'trendDown', className: 'text-danger' },
  flat: { icon: 'chevronRight', className: 'text-info' },
};

function Accordion({ id, icon, title, isOpen, onToggle, delayMs, children }: { id: SectionId; icon: IconName; title: string; isOpen: boolean; onToggle: () => void; delayMs: number; children: ReactNode }) {
  const panelId = `storyteller-${id}`;
  return (
    <div style={{ animationDelay: `${delayMs}ms` }} className={cx('animate-feed-in overflow-hidden rounded-xl ring-1 transition-colors motion-reduce:animate-none', isOpen ? 'bg-surface-2 ring-primary/40' : 'bg-surface-2/60 ring-line')}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-fg transition-colors hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className={cx('grid size-8 shrink-0 place-items-center rounded-lg ring-1 transition-colors', isOpen ? 'bg-primary text-on-primary ring-primary' : 'bg-surface text-primary ring-line')}>
          <Icon name={icon} size={15} />
        </span>
        <span className="flex-1">{title}</span>
        <Icon name="chevronDown" size={16} className={cx('text-fg-subtle transition-transform duration-300', isOpen && 'rotate-180 text-primary')} />
      </button>
      <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden" inert={!isOpen}>
          <div className="flex flex-col gap-3 px-4 pb-4 text-sm leading-relaxed text-fg-muted">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">{children}</p>;
}

export function StorytellerPanel({ story, onClose }: { story: StorytellerStory; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const fullText = `${story.title}\n${story.summary}`;
  const { typed, isThinking, isDone, skip } = useTypewriter(fullText);
  const typedTitle = story.title.slice(0, typed);
  const typedSummary = typed > story.title.length ? story.summary.slice(0, typed - story.title.length - 1) : '';
  const isTypingTitle = typed < story.title.length;

  useEffect(() => {
    closeRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const isUp = story.insights.direction === 'up';
  const toggle = (id: SectionId) => setOpenSection((current) => (current === id ? null : id));
  const caret = <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-primary" />;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex justify-end">
      <button type="button" aria-label="Close Storyteller" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-quick bg-overlay/60 backdrop-blur-[2px] motion-reduce:animate-none" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="storyteller-title"
        className="relative flex h-full w-full max-w-md animate-drawer-in flex-col border-l border-line-strong bg-elevated shadow-pop motion-reduce:animate-none"
      >
        <header className="relative flex items-center gap-2.5 border-b border-line px-5 py-4">
          <StorytellerMark />
          <span className="flex-1 text-base font-semibold text-fg">{storytellerCopy.name}</span>
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
                {storytellerCopy.about}
              </p>
            )}
          </div>
          <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring">
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5" aria-live="polite" aria-busy={!isDone}>
          {isThinking ? (
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <span className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2].map((dot) => (
                    <span key={dot} style={{ animationDelay: `${dot * 150}ms` }} className="size-1.5 animate-bounce rounded-full bg-primary" />
                  ))}
                </span>
                Generating insight…
              </p>
              {[92, 78, 100, 86, 64].map((width, row) => (
                <span key={row} style={{ width: `${width}%`, animationDelay: `${row * 80}ms` }} className="h-3 animate-pulse rounded-full bg-surface-2" />
              ))}
            </div>
          ) : (
            <section className="flex flex-col gap-3">
              <h2 id="storyteller-title" className="text-2xl leading-tight font-semibold tracking-tight text-fg">
                {typedTitle}
                {isTypingTitle && caret}
              </h2>
              {!isTypingTitle && (
                <>
                  <p className="animate-feed-in text-xs text-fg-subtle italic motion-reduce:animate-none">{story.dateLabel}</p>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    {typedSummary}
                    {!isDone && caret}
                  </p>
                </>
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
              <h3 className="animate-feed-in text-lg font-semibold text-fg motion-reduce:animate-none">{storytellerCopy.whatToKnow}</h3>

              <Accordion id="strategy" icon="wallet" title={story.strategy.title} isOpen={openSection === 'strategy'} onToggle={() => toggle('strategy')} delayMs={100}>
                <p>{story.strategy.intro}</p>
                <SubHeading>{storytellerCopy.tradingPlan}</SubHeading>
                <p className="flex gap-2.5">
                  <Icon name={isUp ? 'trendUp' : 'trendDown'} size={16} className={cx('mt-0.5 shrink-0', isUp ? 'text-success' : 'text-danger')} />
                  {story.strategy.plan}
                </p>
                <SubHeading>{storytellerCopy.alternative}</SubHeading>
                <p className="flex gap-2.5">
                  <Icon name={isUp ? 'trendDown' : 'trendUp'} size={16} className={cx('mt-0.5 shrink-0', isUp ? 'text-danger' : 'text-success')} />
                  {story.strategy.alternative}
                </p>
                {story.strategy.performance.length > 0 && <SubHeading>{storytellerCopy.performance}</SubHeading>}
                <ul className="flex flex-col gap-1.5 empty:hidden">
                  {story.strategy.performance.map((row) => {
                    const tone = performanceTone[row.direction];
                    return (
                      <li key={row.label} className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2 ring-1 ring-line">
                        <Icon name={tone.icon} size={15} className={cx('shrink-0', tone.className)} />
                        <span className="flex-1 text-xs">{row.label}</span>
                        <span className={cx('font-mono text-sm font-semibold tabular-nums', tone.className)}>{row.value}</span>
                      </li>
                    );
                  })}
                </ul>
              </Accordion>

              <Accordion id="insights" icon="bolt" title={storytellerCopy.insights} isOpen={openSection === 'insights'} onToggle={() => toggle('insights')} delayMs={200}>
                <div className="flex gap-2.5">
                  <Icon name={story.insights.direction === 'up' ? 'trendUp' : 'trendDown'} size={16} className={cx('mt-0.5 shrink-0', story.insights.direction === 'up' ? 'text-success' : 'text-danger')} />
                  <div>
                    <p className="text-fg">
                      {storytellerCopy.trend} <span className="font-semibold">{story.insights.trend}</span>
                    </p>
                    <p className="mt-1 text-xs text-fg-subtle italic">{story.insights.note}</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-2">
                  {story.insights.points.map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-2.5 h-0.5 w-3 shrink-0 rounded-full bg-primary" />
                      {point}
                    </li>
                  ))}
                </ul>
              </Accordion>

              <Accordion id="multiTimeframe" icon="globe" title={storytellerCopy.multiTimeframe} isOpen={openSection === 'multiTimeframe'} onToggle={() => toggle('multiTimeframe')} delayMs={300}>
                <p>{story.multiTimeframe}</p>
              </Accordion>
            </section>
          )}
        </div>

        <footer className="flex items-start gap-2 border-t border-line px-5 py-3 text-[11px] leading-relaxed text-fg-subtle">
          <StorytellerMark size={14} />
          <p>{storytellerCopy.aiNote}…</p>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
