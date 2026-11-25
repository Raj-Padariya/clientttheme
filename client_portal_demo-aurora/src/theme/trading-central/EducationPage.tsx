'use client';

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';

import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Icon, type IconName } from '../ui/Icon';
import '../promotion/market.css';
import { disclaimerParagraphs } from './economicEvents';
import { COURSE_STATS, courseModules, type CourseModule, type Lesson } from './educationCourse';

type StageMode = 'video' | 'quiz';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SIMULATED_TICK_MS = 1000;
const SCRUB_DOTS = 40;

const faqItems: { questionKey: MessageKey; answerKey: MessageKey }[] = [
  { questionKey: 'tc.edu.faq.checkmarks.q', answerKey: 'tc.edu.faq.checkmarks.a' },
  { questionKey: 'tc.edu.faq.practice.q', answerKey: 'tc.edu.faq.practice.a' },
  { questionKey: 'tc.edu.faq.patterns.q', answerKey: 'tc.edu.faq.patterns.a' },
];

const STAGE_MODES: { value: StageMode; labelKey: MessageKey; icon: IconName }[] = [
  { value: 'video', labelKey: 'tc.edu.watchVideo', icon: 'monitor' },
  { value: 'quiz', labelKey: 'tc.edu.takeQuiz', icon: 'fileText' },
];

// Decorative candles for the hero (y-coords: smaller is higher), a steady uptrend for a TA course.
const HERO_CANDLES = [
  { open: 104, close: 96, high: 90, low: 110 },
  { open: 96, close: 100, high: 92, low: 106 },
  { open: 100, close: 86, high: 80, low: 104 },
  { open: 86, close: 90, high: 82, low: 96 },
  { open: 90, close: 74, high: 68, low: 94 },
  { open: 74, close: 80, high: 70, low: 86 },
  { open: 80, close: 62, high: 56, low: 84 },
  { open: 62, close: 66, high: 58, low: 72 },
  { open: 66, close: 48, high: 42, low: 70 },
  { open: 48, close: 36, high: 30, low: 52 },
];
const HERO_TOP = 25;
const HERO_RANGE = 90;
const toHeroPercent = (y: number) => ((y - HERO_TOP) / HERO_RANGE) * 100;

// Deterministic walk (percent of chart height, higher is up) so server and client draw the same replay chart.
const REPLAY_CANDLES = (() => {
  let price = 40;
  return Array.from({ length: 24 }, (_, index) => {
    const open = price;
    const close = Math.min(80, Math.max(15, open + Math.sin(index * 1.7) * 9 + Math.cos(index * 0.6) * 5 + 1.5));
    const high = Math.min(95, Math.max(open, close) + 4 + (index % 3) * 2);
    const low = Math.max(4, Math.min(open, close) - 4 - (index % 4) * 1.5);
    price = close;
    return { open, close, high, low };
  });
})();

// Accent for live / alert marks: Aurora's clay. Sage (--hero-buy) carries the "done / up" state.
const RED = 'var(--aurora-cta-from)';
const totalLessons = courseModules.reduce((sum, module) => sum + module.lessons.length, 0);

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const beadClass = 'grid shrink-0 place-items-center rounded-lg bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const outlinePillClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] duration-300 hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40';

// Completion is tracked per step ("<lessonId>:video" / "<lessonId>:quiz"); either step finishes the lesson.
function isLessonDone(completed: Set<string>, lessonId: string): boolean {
  return completed.has(`${lessonId}:video`) || completed.has(`${lessonId}:quiz`);
}

function toSeconds(length: string): number {
  const [minutes, seconds] = length.split(':').map(Number);
  return minutes * 60 + seconds;
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatCount(current: number): string {
  return String(Math.round(current));
}

const pad2 = (value: number) => String(value).padStart(2, '0');

function PlayGlyph({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function PauseGlyph({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

/** Solid sage order key with a light sweep; a clay key slot on the right nudges on hover. */
function InkButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'group/ink relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-lg bg-(--hero-buy) px-5 text-sm font-semibold text-[#062520] transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

/** The course uptrend as real candles that grow in one after another, a dashed close line and a blinking last-price tag. */
function CourseChart() {
  const last = HERO_CANDLES[HERO_CANDLES.length - 1];
  const closeLine = HERO_CANDLES.map((candle, index) => `${((index + 0.5) / HERO_CANDLES.length) * 100},${toHeroPercent(candle.close)}`).join(' ');

  return (
    <div aria-hidden="true" className="relative h-40 rounded-lg bg-fg/[0.03] px-2 py-3 ring-1 ring-line">
      {[25, 50, 75].map((top) => (
        <span key={top} style={{ top: `${top}%` }} className="absolute inset-x-2 border-t border-dashed border-fg/[0.07]" />
      ))}
      <div className="relative flex h-full gap-1.5 pr-14">
        {HERO_CANDLES.map((candle, index) => {
          const isUp = candle.close < candle.open;
          const tone = isUp ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)';
          return (
            <span key={index} style={{ '--candle-delay': `${200 + index * 110}ms` } as CSSProperties} className="mkt-candle relative h-full min-w-0 flex-1">
              <span style={{ top: `${toHeroPercent(candle.high)}%`, height: `${toHeroPercent(candle.low) - toHeroPercent(candle.high)}%` }} className={cx('absolute left-1/2 w-px -translate-x-1/2', tone)} />
              <span
                style={{ top: `${toHeroPercent(Math.min(candle.open, candle.close))}%`, height: `${Math.max(2, toHeroPercent(Math.max(candle.open, candle.close)) - toHeroPercent(Math.min(candle.open, candle.close)))}%` }}
                className={cx('absolute inset-x-[15%] rounded-[1px]', tone)}
              />
            </span>
          );
        })}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 left-0 right-14 h-full w-[calc(100%-3.5rem)] overflow-visible">
          <polyline points={closeLine} fill="none" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" className="zenith-reveal stroke-fg/40" />
        </svg>
      </div>
      <span style={{ top: `calc(0.75rem + (100% - 1.5rem) * ${toHeroPercent(last.close) / 100})` }} className="absolute inset-x-2 border-t border-dashed border-(--hero-buy)/60">
        <span className="mkt-blink absolute right-0 -translate-y-1/2 rounded bg-(--hero-buy) px-1.5 py-0.5 font-mono text-[9px] font-black text-[#062520]">
          <Icon name="trendUp" size={11} />
        </span>
      </span>
    </div>
  );
}

/** A course figure as a quote tile: icon key, the number, its label, and a small live volume strip. */
function HeroStat({ icon, children, label, seed }: { icon: IconName; children: ReactNode; label: string; seed: number }) {
  return (
    <div className="group flex min-w-0 flex-col gap-2.5 rounded-lg bg-fg/[0.03] p-3 ring-1 ring-line transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:ring-(--hero-buy)/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <span aria-hidden="true" className={cx(beadClass, 'size-8 transition-transform duration-300 group-hover:-rotate-12')}>
        <Icon name={icon} size={14} />
      </span>
      <span className="font-mono text-3xl leading-none font-black tracking-tighter text-fg tabular-nums">{children}</span>
      <span className="truncate text-xs text-fg-muted">{label}</span>
      <span aria-hidden="true" className="flex h-3 items-end gap-0.5">
        {Array.from({ length: 10 }, (_, bar) => (
          <span key={bar} style={{ height: `${30 + (((bar + seed) * 37) % 70)}%`, '--vol-delay': `${((bar + seed) % 5) * 0.15}s` } as CSSProperties} className="mkt-vol flex-1 rounded-t-[1px] bg-(--hero-buy)/60" />
        ))}
      </span>
    </div>
  );
}

// Course ticker: the course story on the left; guide row, the uptrend candles and three quote tiles on the right.
function CourseHero() {
  return (
    <section className={cx(panelClass, 'grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]')}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span className="mkt-sweep absolute inset-y-0 w-32 -skew-x-12 bg-white/[0.04]" />
      </span>
      <div className="flex min-w-0 flex-col gap-5 border-b border-dashed border-line p-5 sm:p-6 lg:border-r lg:border-b-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="inline-flex items-center gap-2 rounded-md bg-(--hero-buy)/12 py-1 pr-2.5 pl-1.5 text-xs font-semibold text-(--hero-buy) ring-1 ring-(--hero-buy)/30">
            <LiveDot />
            {translate('tc.edu.eyebrow')}
          </p>
          <button
            type="button"
            className="group/help inline-flex items-center gap-1.5 rounded-md py-1 pr-3 pl-1 text-xs font-semibold text-fg ring-1 ring-line-strong transition-colors hover:bg-(--hero-buy)/12 hover:text-(--hero-buy) focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span aria-hidden="true" style={{ background: RED }} className="grid size-5 place-items-center rounded text-[#062520] transition-transform duration-300 group-hover/help:rotate-12">
              <Icon name="info" size={11} />
            </span>
            {translate('tc.edu.help')}
          </button>
        </div>
        <h2 className="text-4xl leading-[0.95] font-black tracking-tighter text-fg sm:text-5xl">{translate('tc.edu.title')}</h2>
        <p className="max-w-xl text-sm leading-relaxed text-fg-muted">{translate('tc.edu.intro1')}</p>
        <p className="max-w-xl border-l-2 border-(--hero-buy) pl-4 text-sm leading-relaxed text-fg-muted">{translate('tc.edu.intro2')}</p>
      </div>

      <div style={staggerStyle(1, 140)} className="flex min-w-0 animate-rise flex-col gap-4 p-5 sm:p-6 motion-reduce:animate-none">
        <div className="flex items-center gap-3 rounded-lg bg-fg/[0.03] p-1.5 ring-1 ring-line">
          <span className="relative grid size-11 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-lg border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
            <span className="grid size-10 place-items-center rounded-lg bg-(--hero-buy) text-xs font-black text-[#062520]">MP</span>
            <span aria-hidden="true" className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-app">
              <LiveDot />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-fg">{translate('tc.edu.guideName')}</p>
            <p className="truncate text-xs text-fg-muted">{translate('tc.edu.guideRole')}</p>
          </div>
          <span aria-hidden="true" className="flex h-8 shrink-0 items-end gap-0.5 pr-1.5">
            {[40, 65, 50, 85, 100].map((height, bar) => (
              <span key={bar} style={{ height: `${height}%`, '--vol-delay': `${bar * 0.15}s` } as CSSProperties} className="mkt-vol w-1.5 rounded-t-[1px] bg-(--hero-buy)" />
            ))}
          </span>
        </div>

        <CourseChart />

        <div className="grid grid-cols-3 gap-2">
          <HeroStat icon="monitor" label={translate('tc.edu.videos')} seed={0}>
            <CountUp value={COURSE_STATS.videos} format={formatCount} />
          </HeroStat>
          <HeroStat icon="fileText" label={translate('tc.edu.quizzes')} seed={3}>
            <CountUp value={COURSE_STATS.quizzes} format={formatCount} />
          </HeroStat>
          <div className="flex min-w-0 flex-col gap-2.5 rounded-lg bg-fg/[0.03] p-3 ring-1 ring-line">
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name="trophy" size={14} />
            </span>
            <span aria-hidden="true" className="flex h-[1.875rem] items-end gap-1 border-b border-dashed border-line-strong">
              {['h-1/3', 'h-2/3', 'h-full'].map((height, index) => (
                <span
                  key={height}
                  style={{ '--candle-delay': `${600 + index * 160}ms` } as CSSProperties}
                  className={cx('mkt-candle w-2.5 rounded-t-[2px]', height, index === 2 ? 'bg-(--aurora-cta-from)' : 'bg-(--hero-buy)')}
                />
              ))}
            </span>
            <span className="truncate text-xs text-fg-muted">{translate('tc.edu.allLevels')}</span>
            <span aria-hidden="true" className="h-3" />
          </div>
        </div>
      </div>
    </section>
  );
}

// Demo player: no media source exists yet, so playback is simulated against the lesson's published length.
// The screen is a chart replay: candles print in colour as playback passes their column.
function VideoStage({ lesson, onComplete }: { lesson: Lesson; onComplete: () => void }) {
  const totalSeconds = lesson.videoLength ? toSeconds(lesson.videoLength) : null;
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!playing || totalSeconds === null) return;
    const intervalId = window.setInterval(() => {
      elapsedRef.current = Math.min(elapsedRef.current + 1, totalSeconds);
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= totalSeconds) {
        setPlaying(false);
        onComplete();
      }
    }, SIMULATED_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [playing, totalSeconds, onComplete]);

  const togglePlayback = () => {
    if (totalSeconds !== null && elapsedRef.current >= totalSeconds) {
      elapsedRef.current = 0;
      setElapsed(0);
    }
    setPlaying((current) => !current);
  };

  const progress = totalSeconds ? (elapsed / totalSeconds) * 100 : 0;
  const litBars = Math.round((progress / 100) * SCRUB_DOTS);
  const playedColumns = Math.round((progress / 100) * REPLAY_CANDLES.length);
  const playLabel = translate(playing ? 'tc.edu.pause' : 'tc.edu.play');

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[#0b0b0d] shadow-[0_30px_60px_-34px_rgb(0_0_0/0.7)] ring-1 ring-white/10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-16 bottom-6 sm:inset-x-10 sm:bottom-10">
          {[25, 50, 75].map((top) => (
            <span key={top} style={{ top: `${top}%` }} className="absolute inset-x-0 border-t border-dashed border-white/[0.06]" />
          ))}
          <div className="relative flex h-full gap-1">
            {REPLAY_CANDLES.map((candle, column) => {
              const isPlayed = column < playedColumns;
              const isHead = totalSeconds !== null && elapsed > 0 && column === playedColumns - 1;
              const isUp = candle.close >= candle.open;
              const tone = isPlayed ? (isUp ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)') : 'bg-white/[0.09]';
              return (
                <span key={column} className="relative h-full min-w-0 flex-1">
                  {isHead && <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-(--aurora-cta-from)/50" />}
                  <span style={{ bottom: `${candle.low}%`, height: `${candle.high - candle.low}%` }} className={cx('absolute left-1/2 w-px -translate-x-1/2 transition-colors duration-500', tone)} />
                  <span
                    style={{ bottom: `${Math.min(candle.open, candle.close)}%`, height: `${Math.max(1.5, Math.abs(candle.close - candle.open))}%`, animationDelay: `${((column * 37) % 23) * 90}ms` }}
                    className={cx('absolute inset-x-[18%] rounded-[1px] transition-colors duration-500', tone, !isPlayed && 'zenith-twinkle')}
                  />
                </span>
              );
            })}
          </div>
        </div>

        <div className="absolute top-5 left-5 flex max-w-[60%] items-center gap-2 rounded-md bg-white py-1 pr-3 pl-1 text-[11px] font-semibold text-[#0b0b0d]">
          <span className="grid size-5 shrink-0 place-items-center rounded bg-(--hero-buy) text-[#062520]">
            <Icon name="monitor" size={11} />
          </span>
          <span className="truncate">{lesson.title}</span>
        </div>
        <div className="absolute top-5 right-5 text-right">
          <p className="rounded-md border-2 border-(--hero-buy) px-3 py-0.5 text-[11px] leading-tight font-bold tracking-wide text-white uppercase">{translate('tc.edu.brand')}</p>
          <p className="mt-1 text-[9px] font-semibold tracking-[0.2em] text-white/70 uppercase">{translate('tc.edu.brandTag')}</p>
        </div>

        <div className="absolute inset-0 grid place-items-center">
          {totalSeconds === null ? (
            <div className="flex flex-col items-center gap-3 text-center text-white/80">
              <span className="relative grid size-20 place-items-center">
                <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl border-2 border-white/30 motion-reduce:hidden" />
                <span className="grid size-14 animate-float place-items-center rounded-xl bg-white text-[#0b0b0d] motion-reduce:animate-none">
                  <Icon name="clock" size={24} />
                </span>
              </span>
              <p className="rounded-md bg-white/10 px-3 py-1 text-sm">{translate('tc.edu.videoSoon')}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={playLabel}
              className={cx(
                'relative grid size-20 place-items-center rounded-2xl bg-(--hero-buy) text-[#062520] shadow-[0_18px_40px_-16px_rgb(0_0_0/0.8)] transition-[transform,opacity] duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-95 motion-reduce:transition-none',
                playing && 'opacity-0 hover:opacity-100 focus-visible:opacity-100',
              )}
            >
              {!playing && (
                <>
                  <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl border-2 border-(--hero-buy) motion-reduce:hidden" />
                  <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl border border-white/40 [animation-delay:0.8s] motion-reduce:hidden" />
                </>
              )}
              <span className="relative translate-x-[1px]">{playing ? <PauseGlyph /> : <PlayGlyph />}</span>
            </button>
          )}
        </div>
      </div>

      {totalSeconds !== null && (
        <div className="flex items-center gap-3 rounded-lg bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line">
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playLabel}
            className="grid size-10 shrink-0 place-items-center rounded-md bg-(--hero-buy) text-[#062520] transition-[transform,background-color] duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none"
          >
            {playing ? <PauseGlyph size={16} /> : <PlayGlyph size={16} />}
          </button>
          <span className="shrink-0 font-mono text-xs text-fg-muted tabular-nums">
            <span className="font-bold text-fg">{formatClock(elapsed)}</span> / {lesson.videoLength}
          </span>
          {/* Scrub track as a volume strip: played bars stand sage, the playhead bar is clay. */}
          <span aria-hidden="true" className="flex h-6 min-w-0 flex-1 items-end gap-[2px]">
            {Array.from({ length: SCRUB_DOTS }, (_, bar) => {
              const isHead = bar === litBars - 1;
              return (
                <span
                  key={bar}
                  style={{ height: isHead ? '100%' : `${30 + ((bar * 37) % 55)}%` }}
                  className={cx('min-w-0 flex-1 rounded-t-[1px] transition-[background-color,height] duration-500', isHead ? 'bg-(--aurora-cta-from)' : bar < litBars ? 'bg-(--hero-buy)' : 'bg-fg/15')}
                />
              );
            })}
          </span>
          <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-end gap-0.5">
            {playing &&
              [60, 100, 40, 80].map((height, index) => (
                <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 0.15}s` }} className="w-0.5 origin-bottom animate-eq-bar rounded-full bg-(--hero-buy) motion-reduce:animate-none" />
              ))}
          </span>
        </div>
      )}
      {lesson.caption && <p className="border-l-2 border-(--hero-buy) pl-3 text-sm text-fg-muted">{lesson.caption}</p>}
    </div>
  );
}

/** Quiz as an order ticket: question bars rise like candles, options are order rows, submit prints fill confirmations. */
function QuizStage({ lesson, onComplete }: { lesson: Lesson; onComplete: () => void }) {
  const questions = lesson.quiz ?? [];
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line-strong py-14 text-center">
        <span aria-hidden="true" className="relative grid size-16 place-items-center">
          <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-xl border motion-reduce:hidden" />
          <span className={cx(beadClass, 'size-12 animate-float motion-reduce:animate-none')}>
            <Icon name="fileText" size={18} />
          </span>
        </span>
        <p className="text-sm font-semibold text-fg">{translate('tc.edu.quizUnavailable')}</p>
        {lesson.quizQuestionCount && (
          <p className="flex items-center gap-2 font-mono text-xs text-fg-muted">
            <span aria-hidden="true" className="flex h-4 items-end gap-0.5">
              {Array.from({ length: lesson.quizQuestionCount }, (_, cell) => (
                <span key={cell} style={{ height: `${40 + ((cell * 37) % 60)}%`, '--vol-delay': `${(cell % 5) * 0.15}s` } as CSSProperties} className="mkt-vol w-1.5 rounded-t-[1px] bg-fg/25" />
              ))}
            </span>
            {lesson.quizQuestionCount} {translate('tc.edu.questions')}
          </p>
        )}
      </div>
    );
  }

  const allAnswered = answers.every((answer) => answer !== null);
  const question = questions[current];
  const isLast = current === questions.length - 1;

  const selectOption = (optionIndex: number) => {
    setAnswers((existing) => existing.map((answer, index) => (index === current ? optionIndex : answer)));
  };

  const submit = () => {
    setSubmitted(true);
    onComplete();
  };

  const retake = () => {
    setAnswers(questions.map(() => null));
    setCurrent(0);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-(--hero-buy)/[0.08] p-2 ring-1 ring-(--hero-buy)/30">
          <p className="flex items-center gap-2.5 text-base font-bold text-fg">
            <span aria-hidden="true" className="relative grid size-10 place-items-center rounded-md bg-success text-white">
              <span className="absolute -inset-0.5 animate-ring-ripple rounded-[8px] border-2 border-success/60 motion-reduce:hidden" />
              <Icon name="checkCircle" size={18} />
            </span>
            {translate('tc.edu.reviewTitle')}
          </p>
          <button type="button" onClick={retake} className={cx(outlinePillClass, 'group/retake bg-app')}>
            <Icon name="refresh" size={15} className="transition-transform duration-500 group-hover/retake:-rotate-180" />
            {translate('tc.edu.retake')}
          </button>
        </div>
        <ol className="grid gap-2 sm:grid-cols-2">
          {questions.map((item, index) => {
            const answerIndex = answers[index];
            return (
              <li key={item.prompt} style={staggerStyle(index, 80)} className="relative flex animate-feed-in flex-col gap-3 overflow-hidden rounded-lg bg-fg/[0.03] p-4 pl-5 ring-1 ring-line motion-reduce:animate-none">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-(--hero-buy)" />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-3xl leading-none font-black tracking-tighter text-fg tabular-nums">Q{pad2(index + 1)}</span>
                  <span className={captionClass}>
                    {translate('tc.edu.question')} {index + 1} {translate('tc.edu.of')} {questions.length}
                  </span>
                </div>
                <p className="text-sm font-bold text-fg">{item.prompt}</p>
                {answerIndex !== null && (
                  <p className="mt-auto flex items-center gap-2 rounded-md bg-fg/[0.05] py-1 pr-3 pl-1 text-sm text-fg-muted">
                    <span className="grid size-7 shrink-0 place-items-center rounded bg-(--hero-buy) font-mono text-[11px] font-black text-[#062520]">{OPTION_LETTERS[answerIndex]}</span>
                    <span className="min-w-0 flex-1">{item.options[answerIndex]}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-end justify-between gap-3">
          <p className="font-mono text-4xl leading-none font-black tracking-tighter text-fg tabular-nums">
            {pad2(current + 1)}
            <span className="text-lg text-fg-subtle">/{pad2(questions.length)}</span>
          </p>
          <p className={captionClass}>
            {translate('tc.edu.question')} {current + 1} {translate('tc.edu.of')} {questions.length}
          </p>
        </div>
        {/* Question candles: one clickable bar per question — answered stand sage, the current one rises clay. */}
        <div className="flex h-7 items-end gap-1.5 border-b border-dashed border-line-strong pt-6">
          {questions.map((item, index) => {
            const isAnswered = answers[index] !== null;
            const isCurrent = index === current;
            return (
              <button
                key={item.prompt}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`${translate('tc.edu.question')} ${index + 1}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={cx(
                  'group/seg relative min-w-0 flex-1 rounded-t-[2px] transition-[background-color,height] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  isCurrent ? 'h-6 bg-(--aurora-cta-from)' : isAnswered ? 'h-4 bg-(--hero-buy) hover:h-5' : 'h-2 bg-fg/12 hover:h-3 hover:bg-fg/25',
                )}
              >
                <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold text-fg-subtle opacity-0 transition-opacity group-hover/seg:opacity-100 group-focus-visible/seg:opacity-100">
                  {index + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div key={current} className="animate-rise motion-reduce:animate-none">
        <h3 className="text-2xl leading-tight font-black tracking-tight text-fg sm:text-3xl">{question.prompt}</h3>
        <p className="mt-1.5 flex items-center gap-2 text-xs text-fg-muted">
          <span aria-hidden="true" className="mkt-blink size-1.5 rounded-[2px] bg-(--aurora-cta-from)" />
          {translate('tc.edu.selectOne')}
        </p>

        <div role="radiogroup" aria-label={question.prompt} className="mt-5 flex flex-col overflow-hidden rounded-lg ring-1 ring-line">
          {question.options.map((option, optionIndex) => {
            const selected = answers[current] === optionIndex;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectOption(optionIndex)}
                style={staggerStyle(optionIndex, 60)}
                className={cx(
                  'group relative flex animate-feed-in items-center gap-3 border-b border-dashed border-line py-2 pr-4 pl-3 text-left text-sm font-medium transition-[background-color,color] duration-300 last:border-b-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:scale-[0.995] motion-reduce:animate-none motion-reduce:transition-none',
                  selected ? 'bg-(--hero-buy)/12 text-fg' : 'text-fg-muted hover:bg-fg/[0.04] hover:text-fg',
                )}
              >
                <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1 transition-colors duration-300', selected ? 'bg-(--hero-buy)' : 'bg-transparent')} />
                <span
                  className={cx(
                    'grid size-9 shrink-0 place-items-center rounded-md font-mono text-sm font-black transition-[transform,background-color,color] duration-300 group-hover:-rotate-6 motion-reduce:transition-none',
                    selected ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/[0.06] text-fg',
                  )}
                >
                  {OPTION_LETTERS[optionIndex]}
                </span>
                <span className="min-w-0 flex-1">{option}</span>
                <span aria-hidden="true" className={cx('grid size-6 shrink-0 place-items-center rounded transition-colors', selected ? 'bg-(--hero-buy) text-[#062520]' : 'border border-dashed border-line-strong')}>
                  {selected && <Icon name="check" size={12} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-dashed border-line pt-5">
        <button type="button" disabled={current === 0} onClick={() => setCurrent((index) => index - 1)} className={outlinePillClass}>
          <Icon name="arrowLeft" size={15} />
          {translate('tc.edu.previous')}
        </button>
        {isLast ? (
          <InkButton disabled={!allAnswered} onClick={submit} className="pr-1.5">
            {translate('tc.edu.submitReview')}
            <span aria-hidden="true" style={{ background: RED }} className="grid size-8 place-items-center rounded-md text-[#062520]">
              <Icon name="checkCircle" size={14} />
            </span>
          </InkButton>
        ) : (
          <InkButton onClick={() => setCurrent((index) => index + 1)} className="pr-1.5">
            {translate('tc.edu.next')}
            <span aria-hidden="true" style={{ background: RED }} className="grid size-8 place-items-center rounded-md text-[#062520] transition-transform duration-300 group-hover/ink:translate-x-0.5">
              <Icon name="arrowRight" size={14} />
            </span>
          </InkButton>
        )}
      </div>
    </div>
  );
}

/** Video / quiz as a buy-sell style segmented switch: a sage block slides under the active side. */
function ModeTabs({ mode, onChange }: { mode: StageMode; onChange: (mode: StageMode) => void }) {
  const activeIndex = Math.max(0, STAGE_MODES.findIndex((item) => item.value === mode));
  return (
    <div role="tablist" className="relative grid grid-cols-2 gap-1 rounded-lg bg-fg/[0.03] p-1 ring-1 ring-line">
      <span
        aria-hidden="true"
        style={{ transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 0.25}rem))` }}
        className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.375rem)] overflow-hidden rounded-md bg-(--hero-buy) transition-transform duration-500 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none"
      >
        <span className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />
      </span>
      {STAGE_MODES.map((item) => {
        const isActive = mode === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cx(
              'group/mode relative flex items-center gap-2.5 rounded-md py-1.5 pr-3 pl-1.5 text-sm font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98]',
              isActive ? 'text-[#062520]' : 'text-fg-muted hover:text-fg',
            )}
          >
            <span
              aria-hidden="true"
              className={cx('grid size-9 shrink-0 place-items-center rounded transition-[background-color,transform] duration-300 group-hover/mode:scale-110', isActive ? 'bg-[#062520]/15' : 'bg-fg/[0.06]')}
            >
              <Icon name={item.icon} size={15} />
            </span>
            <span className="truncate">{translate(item.labelKey)}</span>
            {isActive && <span aria-hidden="true" className="mkt-blink ml-auto h-3.5 w-1.5 rounded-[1px] bg-(--aurora-cta-from)" />}
          </button>
        );
      })}
    </div>
  );
}

function LessonStage({
  module,
  lesson,
  lessonNumber,
  mode,
  onModeChange,
  hasNext,
  onNext,
  onComplete,
}: {
  module: CourseModule;
  lesson: Lesson;
  lessonNumber: string;
  mode: StageMode;
  onModeChange: (mode: StageMode) => void;
  hasNext: boolean;
  onNext: () => void;
  onComplete: () => void;
}) {
  return (
    <section style={staggerStyle(2, 200)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col motion-reduce:animate-none')} aria-label={lesson.title}>
      <header className="flex flex-wrap items-center gap-4 border-b border-dashed border-line p-5">
        <span className="rounded-lg bg-(--hero-buy) px-2.5 py-1 font-mono text-5xl leading-none font-black tracking-tighter text-[#062520] tabular-nums">{lessonNumber}</span>
        <div className="min-w-0 flex-1">
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className="mkt-blink size-1.5 rounded-[2px] bg-(--aurora-cta-from)" />
            {translate('tc.edu.module')} {module.id} · {module.title}
          </p>
          <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-fg">{lesson.title}</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-fg/[0.05] px-2 py-0.5 text-xs text-fg-muted">
            <Icon name={mode === 'video' ? 'monitor' : 'fileText'} size={12} />
            {translate(mode === 'video' ? 'tc.edu.video' : 'tc.edu.quiz')}
          </p>
        </div>
        <InkButton disabled={!hasNext} onClick={onNext} className="pr-1.5">
          {translate('tc.edu.nextLesson')}
          <span aria-hidden="true" style={{ background: RED }} className="grid size-8 place-items-center rounded-md text-[#062520] transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
            <Icon name="arrowRight" size={14} />
          </span>
        </InkButton>
      </header>

      <div className="flex flex-col gap-5 p-5">
        <ModeTabs mode={mode} onChange={onModeChange} />
        {mode === 'video' ? <VideoStage key={lesson.id} lesson={lesson} onComplete={onComplete} /> : <QuizStage key={lesson.id} lesson={lesson} onComplete={onComplete} />}
      </div>
    </section>
  );
}

function CourseOutline({
  openModuleId,
  onToggleModule,
  activeModuleId,
  activeLessonId,
  mode,
  completed,
  onSelect,
}: {
  openModuleId: number | null;
  onToggleModule: (moduleId: number) => void;
  activeModuleId: number;
  activeLessonId: string;
  mode: StageMode;
  completed: Set<string>;
  onSelect: (moduleId: number, lessonId: string, mode: StageMode) => void;
}) {
  const completedCount = courseModules.reduce((sum, module) => sum + module.lessons.filter((lesson) => isLessonDone(completed, lesson.id)).length, 0);
  const completedShare = Math.round((completedCount / Math.max(1, totalLessons)) * 100);

  return (
    <aside style={staggerStyle(3, 200)} className="flex min-w-0 animate-rise flex-col gap-4 xl:sticky xl:top-24 xl:self-start motion-reduce:animate-none">
      <div className={cx(panelClass, 'flex flex-col gap-4 p-5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-black text-fg">
              <span aria-hidden="true" className={cx(beadClass, 'size-7')}>
                <Icon name="compass" size={13} />
              </span>
              {translate('tc.edu.courseMap')}
            </h2>
            <p className="mt-1.5 text-[11px] text-fg-subtle">{translate('tc.edu.completedOf')}</p>
          </div>
          <p className="shrink-0 font-mono text-3xl leading-none font-black tracking-tighter text-fg tabular-nums">
            <span className="text-(--hero-buy)">{completedCount}</span>
            <span className="text-base text-fg-subtle">/{totalLessons}</span>
          </p>
        </div>
        {/* Lesson volume strip: one bar per lesson grouped by module — done bars stand tall in sage, the lesson open now blinks clay. */}
        <div aria-hidden="true" className="flex h-8 flex-wrap items-end gap-x-2 border-b border-dashed border-line-strong pb-0.5">
          {courseModules.map((module) => (
            <span key={module.id} className="flex h-full items-end gap-0.5">
              {module.lessons.length === 0 ? (
                <span className="h-1/4 w-2 rounded-t-[1px] border border-b-0 border-dashed border-line-strong" />
              ) : (
                module.lessons.map((lesson, lessonIndex) => {
                  const isNow = activeModuleId === module.id && activeLessonId === lesson.id;
                  const isDone = isLessonDone(completed, lesson.id);
                  return (
                    <span
                      key={lesson.id}
                      style={isNow ? undefined : ({ '--candle-delay': `${module.id * 80 + lessonIndex * 40}ms` } as CSSProperties)}
                      className={cx('w-2 rounded-t-[1px] transition-[height,background-color] duration-500', isNow ? 'mkt-blink h-full bg-(--aurora-cta-from)' : cx('mkt-candle', isDone ? 'h-3/4 bg-(--hero-buy)' : 'h-1/3 bg-fg/15'))}
                    />
                  );
                })
              )}
            </span>
          ))}
        </div>
        <span className="relative h-1.5 overflow-hidden rounded-[2px] bg-fg/10">
          <span style={{ width: `${completedShare}%` }} className="absolute inset-y-0 left-0 overflow-hidden rounded-[2px] bg-(--hero-buy) transition-[width] duration-700 motion-reduce:transition-none">
            <span className="mkt-sweep absolute inset-y-0 w-5 -skew-x-12 bg-white/40" />
          </span>
        </span>
      </div>

      <div className={cx(panelClass, 'flex flex-col')}>
        {courseModules.map((module) => {
          const isOpen = openModuleId === module.id;
          const isActiveModule = activeModuleId === module.id;
          const moduleDone = module.lessons.length > 0 && module.lessons.every((lesson) => isLessonDone(completed, lesson.id));
          const moduleDoneCount = module.lessons.filter((lesson) => isLessonDone(completed, lesson.id)).length;

          return (
            <div
              key={module.id}
              className={cx('relative border-b border-dashed border-line transition-colors duration-300 last:border-b-0', isOpen || isActiveModule ? 'bg-fg/[0.03]' : 'hover:bg-fg/[0.02]')}
            >
              <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1 transition-colors duration-300', isActiveModule ? 'bg-(--hero-buy)' : 'bg-transparent')} />
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => onToggleModule(module.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  className={cx(
                    'grid size-10 shrink-0 place-items-center rounded-md font-mono text-sm font-black transition-colors',
                    moduleDone ? 'bg-success text-white' : isActiveModule ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/[0.06] text-fg-muted',
                  )}
                >
                  {moduleDone ? <Icon name="check" size={15} /> : pad2(module.id)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-fg">{module.title}</span>
                  <span className="flex items-center gap-2 font-mono text-[10px] text-fg-subtle">
                    <span>
                      {translate('tc.edu.module')} {module.id}
                      {module.lessons.length > 0 && ` · ${module.lessons.length} ${translate('tc.edu.lessons')}`}
                    </span>
                    {module.lessons.length > 0 && (
                      <span aria-hidden="true" className="flex h-2.5 items-end gap-0.5">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <span key={lesson.id} className={cx('w-1.5 rounded-t-[1px]', lessonIndex < moduleDoneCount ? 'h-full bg-(--hero-buy)' : 'h-1/2 bg-fg/15')} />
                        ))}
                      </span>
                    )}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cx('grid size-8 shrink-0 place-items-center rounded-md transition-[rotate,color,background-color] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 bg-(--aurora-cta-from) text-[#062520]' : 'text-fg-subtle ring-1 ring-line')}
                >
                  <Icon name="plus" size={12} />
                </span>
              </button>

              <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="min-h-0 overflow-hidden">
                  {module.lessons.length === 0 ? (
                    <p className="mx-3 mb-3 flex items-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-2 text-xs text-fg-muted">
                      <Icon name="clock" size={12} />
                      {translate('tc.edu.modulePending')}
                    </p>
                  ) : (
                    <ol className="flex flex-col gap-1 px-3 pb-3">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const isActive = isActiveModule && activeLessonId === lesson.id;
                        const isDone = isLessonDone(completed, lesson.id);
                        const lessonNumber = pad2(lessonIndex + 1);

                        if (!isActive) {
                          return (
                            <li key={lesson.id}>
                              <button
                                type="button"
                                onClick={() => onSelect(module.id, lesson.id, 'video')}
                                className="group flex w-full items-center gap-2.5 rounded-md py-1 pr-3 pl-1 text-left text-sm text-fg-muted transition-[background-color,color,translate] duration-200 hover:translate-x-0.5 hover:bg-fg/[0.05] hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                              >
                                <span
                                  className={cx(
                                    'grid size-7 shrink-0 place-items-center rounded font-mono text-[10px] font-bold tabular-nums transition-colors',
                                    isDone ? 'bg-success text-white' : 'text-fg-subtle ring-1 ring-line group-hover:bg-(--hero-buy) group-hover:text-[#062520] group-hover:ring-(--hero-buy)',
                                  )}
                                >
                                  {isDone ? <Icon name="check" size={11} /> : lessonNumber}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                                <span aria-hidden="true" className="flex h-2.5 shrink-0 items-end gap-0.5">
                                  {STAGE_MODES.map((step) => (
                                    <span key={step.value} className={cx('w-1.5 rounded-t-[1px]', completed.has(`${lesson.id}:${step.value}`) ? 'h-full bg-(--hero-buy)' : 'h-1/2 bg-fg/15')} />
                                  ))}
                                </span>
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li key={lesson.id} aria-current="step" className="relative my-1 animate-rise overflow-hidden rounded-lg bg-(--hero-buy)/10 p-3 ring-1 ring-(--hero-buy)/40 motion-reduce:animate-none">
                            <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-16 -skew-x-12 bg-white/[0.05]" />
                            <div className="relative flex items-center gap-2.5">
                              <span
                                className={cx(
                                  'relative grid size-9 shrink-0 place-items-center rounded-md font-mono text-[11px] font-black tabular-nums',
                                  isDone ? 'bg-success text-white' : 'bg-(--aurora-cta-from) text-[#062520]',
                                )}
                              >
                                {!isDone && <span aria-hidden="true" className="absolute -inset-0.5 animate-ring-ripple rounded-[8px] border-2 border-(--aurora-cta-from) motion-reduce:hidden" />}
                                <span className="relative">{isDone ? <Icon name="check" size={13} /> : lessonNumber}</span>
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
                                  {translate('tc.edu.lesson')} {lessonNumber}
                                </p>
                                <p className="truncate text-sm font-bold text-fg" title={lesson.title}>
                                  {lesson.title}
                                </p>
                              </div>
                              <span className={cx('shrink-0 rounded px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase', isDone ? 'bg-success text-white' : 'bg-(--aurora-cta-from) text-[#062520]')}>
                                {translate(isDone ? 'tc.edu.statusDone' : 'tc.edu.statusNow')}
                              </span>
                            </div>

                            <div className="relative mt-3 grid grid-cols-2 gap-1.5">
                              {STAGE_MODES.map((step) => {
                                const selected = mode === step.value;
                                const stepDone = completed.has(`${lesson.id}:${step.value}`);
                                const meta =
                                  step.value === 'video'
                                    ? lesson.videoMinutes
                                      ? `${lesson.videoMinutes} ${translate('tc.edu.min')}`
                                      : null
                                    : lesson.quizQuestionCount
                                      ? `${lesson.quizQuestionCount} ${translate('tc.edu.questions')}`
                                      : null;
                                return (
                                  <button
                                    key={step.value}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => onSelect(module.id, lesson.id, step.value)}
                                    className={cx(
                                      'flex items-center gap-2 rounded-md py-1 pr-2.5 pl-1 text-left transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                                      selected ? 'bg-(--hero-buy) text-[#062520]' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
                                    )}
                                  >
                                    <span className={cx('grid size-7 shrink-0 place-items-center rounded', selected ? 'bg-[#062520]/15' : 'bg-fg/[0.06]')}>
                                      <Icon name={step.icon} size={12} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[11px] font-bold">{translate(step.labelKey)}</span>
                                      <span className={cx('block font-mono text-[10px]', selected ? 'text-[#062520]/70' : 'text-fg-subtle')}>{meta ?? '—'}</span>
                                    </span>
                                    {stepDone && <Icon name="checkCircle" size={14} className={cx('shrink-0', selected ? 'text-[#062520]' : 'text-success')} />}
                                  </button>
                                );
                              })}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/** FAQ as a desk Q&A blotter: intro column with a bar per question (open one rises clay), ruled question rows on the right. */
function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className={cx(panelClass, 'grid md:grid-cols-[16rem_minmax(0,1fr)]')}>
      <div className="flex flex-col gap-3 border-b border-dashed border-line p-5 md:border-r md:border-b-0">
        <span aria-hidden="true" className="relative grid size-12 place-items-center">
          <span className="absolute inset-0 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
          <span className={cx(beadClass, 'size-10')}>
            <Icon name="info" size={17} />
          </span>
        </span>
        <h2 className="text-2xl font-black tracking-tight text-fg">{translate('tc.edu.faqTitle')}</h2>
        <p className="text-sm text-fg-muted">{translate('tc.edu.faqHint')}</p>
        <span aria-hidden="true" className="mt-auto flex h-5 items-end gap-1">
          {faqItems.map((item, index) => (
            <span key={item.questionKey} className={cx('w-6 rounded-t-[2px] transition-[height,background-color] duration-300', openIndex === index ? 'h-full bg-(--aurora-cta-from)' : 'h-1/3 bg-fg/15')} />
          ))}
        </span>
      </div>

      <ol className="flex min-w-0 flex-col">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <li key={item.questionKey} className={cx('relative min-w-0 border-b border-dashed border-line transition-colors duration-300 last:border-b-0', isOpen ? 'bg-(--hero-buy)/[0.06]' : 'hover:bg-fg/[0.03]')}>
              <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1 transition-colors duration-300', isOpen ? 'bg-(--hero-buy)' : 'bg-transparent')} />
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
              >
                <span
                  aria-hidden="true"
                  className={cx('relative grid size-10 shrink-0 place-items-center rounded-md font-mono text-xs font-black tabular-nums transition-colors duration-300', isOpen ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/[0.06] text-fg-muted')}
                >
                  {isOpen && <span className="absolute -inset-1 animate-ring-ripple rounded-[8px] border-2 border-(--hero-buy) motion-reduce:hidden" />}
                  Q{pad2(index + 1)}
                </span>
                <span className="flex-1 text-sm font-bold text-fg">{translate(item.questionKey)}</span>
                <span
                  aria-hidden="true"
                  className={cx('grid size-8 shrink-0 place-items-center rounded-md transition-[rotate,color,background-color] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 bg-(--aurora-cta-from) text-[#062520]' : 'text-fg-subtle ring-1 ring-line')}
                >
                  <Icon name="plus" size={12} />
                </span>
              </button>
              <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <p className="min-h-0 overflow-hidden text-sm leading-relaxed text-fg-muted">
                  <span className="mr-4 mb-4 ml-[4rem] block border-l-2 border-dashed border-(--hero-buy) pl-3 sm:ml-[4.5rem]">{translate(item.answerKey)}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Modules as a sector tape: one quote tile per module with a lesson candle strip; the active tile prints sage with a sweeping top rule. */
function ModuleRail({ activeModuleId, completed, onSelect }: { activeModuleId: number; completed: Set<string>; onSelect: (moduleId: number) => void }) {
  return (
    <nav aria-label={translate('tc.edu.modulesLabel')} style={staggerStyle(1, 150)} className={cx(panelClass, 'animate-rise p-2 motion-reduce:animate-none')}>
      <div role="tablist" className="flex gap-2 overflow-x-auto [scrollbar-width:thin]">
        {courseModules.map((module, index) => {
          const isActive = module.id === activeModuleId;
          const doneLessons = module.lessons.filter((lesson) => isLessonDone(completed, lesson.id)).length;
          const moduleDone = module.lessons.length > 0 && doneLessons === module.lessons.length;
          const segments = Math.max(module.lessons.length, 1);

          return (
            <button
              key={module.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(module.id)}
              style={staggerStyle(index, 90)}
              className={cx(
                'group relative flex min-w-52 flex-1 animate-feed-in flex-col gap-3 overflow-hidden rounded-lg p-3 text-left ring-1 transition-[background-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:hover:translate-y-0',
                isActive ? 'bg-(--hero-buy)/10 ring-(--hero-buy)/45' : 'bg-fg/[0.02] ring-line hover:ring-line-strong',
              )}
            >
              <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-[3px] overflow-hidden', isActive ? 'bg-(--hero-buy)/40' : 'bg-transparent')}>
                {isActive && <span className="mkt-sweep absolute inset-y-0 w-16 bg-(--hero-buy)" />}
              </span>
              <span className="flex items-center gap-2.5">
                <span
                  className={cx(
                    'relative grid size-10 shrink-0 place-items-center rounded-md font-mono text-sm font-black transition-transform duration-300 group-hover:-rotate-6',
                    moduleDone ? 'bg-success text-white' : isActive ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/[0.06] text-fg-muted',
                  )}
                >
                  {isActive && !moduleDone && <span aria-hidden="true" className="absolute -inset-1 animate-ring-ripple rounded-[8px] border-2 border-(--hero-buy) motion-reduce:hidden" />}
                  <span className="relative">{moduleDone ? <Icon name="check" size={15} /> : pad2(module.id)}</span>
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className={cx('text-[10.5px] font-semibold tracking-[0.14em] uppercase', isActive ? 'text-(--hero-buy)' : 'text-fg-subtle')}>
                    {translate('tc.edu.module')} {module.id}
                  </span>
                  <span className={cx('truncate text-sm font-bold', isActive ? 'text-fg' : 'text-fg-muted group-hover:text-fg')}>{module.title}</span>
                </span>
              </span>
              <span className="flex items-end gap-2">
                <span aria-hidden="true" className="flex h-4 min-w-0 flex-1 items-end gap-1 border-b border-dashed border-line-strong">
                  {Array.from({ length: segments }, (_, segment) => (
                    <span
                      key={segment}
                      className={cx(
                        'min-w-0 flex-1 rounded-t-[1px] transition-[height,background-color] duration-500',
                        module.lessons.length === 0
                          ? 'h-1/3 border border-b-0 border-dashed border-line-strong'
                          : segment < doneLessons
                            ? 'h-full bg-(--hero-buy)'
                            : isActive
                              ? 'h-1/2 bg-(--hero-buy)/25'
                              : 'h-1/3 bg-fg/12',
                      )}
                    />
                  ))}
                </span>
                {module.lessons.length > 0 && (
                  <span className="shrink-0 font-mono text-[10px] text-fg-subtle">
                    {module.lessons.length} {translate('tc.edu.lessons')}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** A module with no lessons yet, shown like a listing before it opens: ghost volume bars waiting for the first print. */
function ModulePendingStage({ module }: { module: CourseModule }) {
  return (
    <section aria-label={module.title} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col items-center justify-center gap-3 px-6 py-16 text-center motion-reduce:animate-none')}>
      <span className="relative grid size-20 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
        <span className={cx(beadClass, 'size-14 rounded-xl font-mono text-2xl font-black')}>{pad2(module.id)}</span>
        <span aria-hidden="true" style={{ background: RED }} className="mkt-blink absolute top-0 right-0 size-3 rounded-[3px]" />
      </span>
      <span aria-hidden="true" className="flex h-8 w-full max-w-xs items-end gap-[3px] border-b border-dashed border-line-strong pb-0.5">
        {Array.from({ length: 20 }, (_, bar) => (
          <span key={bar} style={{ height: `${25 + ((bar * 37) % 75)}%`, '--vol-delay': `${(bar % 6) * 0.15}s` } as CSSProperties} className="mkt-vol flex-1 rounded-t-[1px] bg-fg/15" />
        ))}
      </span>
      <p className={captionClass}>
        {translate('tc.edu.module')} {module.id}
      </p>
      <h2 className="text-3xl font-black tracking-tight text-fg">{module.title}</h2>
      <p className="inline-flex max-w-sm items-center gap-2 rounded-md bg-fg/[0.05] px-3 py-1 text-sm text-fg-muted">
        <Icon name="clock" size={13} />
        {translate('tc.edu.modulePending')}
      </p>
    </section>
  );
}

// Skeleton: terminal title bar → course ticker (story | candles + quote tiles) → module sector tape → course watchlist on the left beside the lesson terminal → Q&A blotter → disclaimer.
export default function EducationPage() {
  const firstModule = courseModules[0];
  const [activeModuleId, setActiveModuleId] = useState(firstModule.id);
  const [openModuleId, setOpenModuleId] = useState<number | null>(firstModule.id);
  const [activeLessonId, setActiveLessonId] = useState(firstModule.lessons[0].id);
  const [mode, setMode] = useState<StageMode>('video');
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());

  const activeModule = courseModules.find((module) => module.id === activeModuleId) ?? firstModule;
  const lessonIndex = Math.max(
    0,
    activeModule.lessons.findIndex((lesson) => lesson.id === activeLessonId),
  );
  const activeLesson: Lesson | undefined = activeModule.lessons[lessonIndex];
  const nextLesson: Lesson | undefined = activeModule.lessons[lessonIndex + 1];

  const selectLesson = (moduleId: number, lessonId: string, nextMode: StageMode) => {
    setActiveModuleId(moduleId);
    setActiveLessonId(lessonId);
    setMode(nextMode);
  };

  const selectModule = (moduleId: number) => {
    const selectedModule = courseModules.find((item) => item.id === moduleId);
    if (!selectedModule) return;
    setActiveModuleId(moduleId);
    setOpenModuleId(moduleId);
    setActiveLessonId(selectedModule.lessons[0]?.id ?? '');
    setMode('video');
  };

  const markComplete = () => {
    if (!activeLesson) return;
    const stepKey = `${activeLesson.id}:${mode}`;
    setCompleted((current) => (current.has(stepKey) ? current : new Set(current).add(stepKey)));
  };

  return (
    <div className="flex flex-col gap-6">
      <header className={cx(panelClass, 'flex animate-rise items-center gap-4 p-5 motion-reduce:animate-none sm:p-6')}>
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
          <span className={cx(beadClass, 'size-11')}>
            <Icon name="compass" size={18} />
          </span>
          <span aria-hidden="true" style={{ background: RED }} className="mkt-blink absolute -top-0.5 -right-0.5 size-2.5 rounded-[2px]" />
        </span>
        <h1 className="min-w-0 truncate text-3xl font-black tracking-tight text-fg sm:text-4xl">{translate('nav.tcEducation')}</h1>
        <span aria-hidden="true" className="ml-auto hidden h-8 items-end gap-0.5 sm:flex">
          {[35, 55, 45, 70, 60, 85, 75, 100].map((height, bar) => (
            <span key={bar} style={{ height: `${height}%`, '--vol-delay': `${(bar % 5) * 0.15}s` } as CSSProperties} className="mkt-vol w-1.5 rounded-t-[1px] bg-(--hero-buy)" />
          ))}
        </span>
      </header>

      <CourseHero />

      <ModuleRail activeModuleId={activeModuleId} completed={completed} onSelect={selectModule} />

      <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="min-w-0 xl:order-2">
          {activeLesson ? (
            <LessonStage
              module={activeModule}
              lesson={activeLesson}
              lessonNumber={pad2(lessonIndex + 1)}
              mode={mode}
              onModeChange={setMode}
              hasNext={Boolean(nextLesson)}
              onNext={() => nextLesson && selectLesson(activeModule.id, nextLesson.id, 'video')}
              onComplete={markComplete}
            />
          ) : (
            <ModulePendingStage key={activeModule.id} module={activeModule} />
          )}
        </div>
        <div className="min-w-0 xl:sticky xl:top-24 xl:order-1 xl:self-start">
          <CourseOutline
            openModuleId={openModuleId}
            onToggleModule={(moduleId) => setOpenModuleId((current) => (current === moduleId ? null : moduleId))}
            activeModuleId={activeModuleId}
            activeLessonId={activeLesson?.id ?? ''}
            mode={mode}
            completed={completed}
            onSelect={selectLesson}
          />
        </div>
      </div>

      <FaqSection />

      <footer className={cx(panelClass, 'flex gap-4 p-5 text-[11px] leading-relaxed text-fg-subtle')}>
        <span aria-hidden="true" style={{ background: RED }} className="grid size-9 shrink-0 place-items-center rounded-lg text-[#062520]">
          <Icon name="fileText" size={15} />
        </span>
        <ol className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph, index) => (
            <li key={paragraph} className="flex gap-2.5">
              <span aria-hidden="true" className="font-mono text-[10px] font-bold text-(--aurora-cta-from)">
                {pad2(index + 1)}
              </span>
              <p>{paragraph}</p>
            </li>
          ))}
        </ol>
      </footer>
    </div>
  );
}
