'use client';

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';

import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Icon, type IconName } from '../ui/Icon';
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

// Decorative closes for the hero (y-coords: smaller is higher), a steady uptrend for a TA course, drawn as a stepped pixel path.
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
const TREND_WIDTH = 300;
const TREND_HEIGHT = 120;
const TREND_GRID = 10;

const RED = 'var(--zenith-red)';
const totalLessons = courseModules.reduce((sum, module) => sum + module.lessons.length, 0);


const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const outlinePillClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] duration-300 hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40';

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

/** Solid capsule with a red bead slot on the right that nudges on hover. */
function InkButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'group/ink relative inline-flex h-11 items-center justify-center gap-2 rounded-full bg-fg px-5 text-sm font-semibold text-app transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

/** Progress as a ring of square pixels: `value` percent of them are lit, the leading lit pixel is red. */
function DotRing({ value, dots, litClass = 'bg-fg', offClass = 'bg-fg/15', dotSize = 'size-1.5' }: { value: number; dots: number; litClass?: string; offClass?: string; dotSize?: string }) {
  const litCount = Math.round((Math.min(100, Math.max(0, value)) / 100) * dots);
  return (
    <span aria-hidden="true" className="absolute inset-0">
      {Array.from({ length: dots }, (_, dot) => {
        const angle = (dot / dots) * 2 * Math.PI - Math.PI / 2;
        const isHead = litCount > 0 && litCount < dots && dot === litCount - 1;
        return (
          <span
            key={dot}
            style={{ left: `${50 + 47 * Math.cos(angle)}%`, top: `${50 + 47 * Math.sin(angle)}%`, ...(isHead ? { background: RED } : {}) }}
            className={cx('absolute -translate-x-1/2 -translate-y-1/2 rounded-[2px] transition-colors duration-500', dotSize, isHead ? '' : dot < litCount ? litClass : offClass)}
          />
        );
      })}
    </span>
  );
}

/** Uptrend as a stepped path over a pixel field: square stops at each close, a red pulsing head on the latest one. */
function TrendPath() {
  const stepX = TREND_WIDTH / (HERO_CANDLES.length - 1);
  const minY = Math.min(...HERO_CANDLES.map((candle) => candle.close));
  const maxY = Math.max(...HERO_CANDLES.map((candle) => candle.close));
  const toY = (close: number) => 12 + ((close - minY) / (maxY - minY)) * (TREND_HEIGHT - 24);
  const points = HERO_CANDLES.map((candle, index) => ({ x: index * stepX, y: toY(candle.close) }));
  const stepped = points.map((point, index) => (index === 0 ? `M${point.x},${point.y}` : `H${point.x} V${point.y}`)).join(' ');
  const head = points[points.length - 1];

  return (
    <svg viewBox={`-8 0 ${TREND_WIDTH + 16} ${TREND_HEIGHT}`} className="h-32 w-full overflow-visible" aria-hidden="true">
      {Array.from({ length: TREND_GRID }, (_, row) =>
        Array.from({ length: HERO_CANDLES.length * 3 - 2 }, (_, col) => (
          <rect key={`${row}-${col}`} x={(col * stepX) / 3 - 1} y={(row * TREND_HEIGHT) / TREND_GRID + 4} width="2" height="2" rx="0.5" className="fill-fg/10" />
        )),
      )}
      <path d={`${stepped} V${TREND_HEIGHT} H0 Z`} className="fill-fg/[0.05]" />
      <path d={stepped} fill="none" strokeWidth="2.5" strokeLinejoin="round" className="zenith-reveal stroke-fg" />
      {points.slice(0, -1).map((point, index) => (
        <rect
          key={index}
          x={point.x - 4}
          y={point.y - 4}
          width="8"
          height="8"
          rx="2"
          style={{ animationDelay: `${200 + index * 120}ms` }}
          className="origin-center animate-dot-pop fill-fg stroke-app [transform-box:fill-box] motion-reduce:animate-none"
          strokeWidth="2"
        />
      ))}
      <circle cx={head.x} cy={head.y} r="6" style={{ fill: RED }} />
      <circle cx={head.x} cy={head.y} r="6" fill="none" strokeWidth="2" style={{ stroke: RED }} className="motion-reduce:hidden">
        <animate attributeName="r" values="6;18" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function HeroStat({ icon, children, label }: { icon: IconName; children: ReactNode; label: string }) {
  return (
    <div className="group flex min-w-0 flex-col gap-3 rounded-[24px] bg-fg/[0.03] p-4 ring-1 ring-line transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:ring-line-strong motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <span aria-hidden="true" className={cx(beadClass, 'size-9 transition-transform duration-300 group-hover:-rotate-12')}>
        <Icon name={icon} size={14} />
      </span>
      <span className="font-mono text-4xl leading-none font-black tracking-tighter text-fg tabular-nums">{children}</span>
      <span className="truncate text-xs text-fg-muted">{label}</span>
    </div>
  );
}

// Open hero band: course story on the left; guide capsule, stepped trend and stat capsules on the right.
function CourseHero() {
  return (
    <section className="zenith-tile grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="inline-flex items-center gap-2 rounded-full bg-fg py-1 pr-3 pl-2 text-xs font-semibold text-app">
            <LiveDot />
            {translate('tc.edu.eyebrow')}
          </p>
          <button
            type="button"
            className="group/help inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-xs font-semibold text-fg ring-1 ring-line-strong transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span aria-hidden="true" style={{ background: RED }} className="grid size-5 place-items-center rounded-full text-white transition-transform duration-300 group-hover/help:rotate-12">
              <Icon name="info" size={11} />
            </span>
            {translate('tc.edu.help')}
          </button>
        </div>
        <h2 className="text-5xl leading-[0.95] font-black tracking-tighter text-fg sm:text-6xl">{translate('tc.edu.title')}</h2>
        <p className="max-w-xl text-sm leading-relaxed text-fg-muted">{translate('tc.edu.intro1')}</p>
        <p className="max-w-xl border-l-2 border-[var(--zenith-red)] pl-4 text-sm leading-relaxed text-fg-muted">{translate('tc.edu.intro2')}</p>
      </div>

      <div style={staggerStyle(1, 140)} className="flex min-w-0 animate-rise flex-col gap-5 border-t border-line pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10 motion-reduce:animate-none">
        <div className="flex items-center gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-1.5 pl-1.5 ring-1 ring-line">
          <span className="relative grid size-12 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/30 motion-reduce:animate-none" />
            <span className="grid size-9 place-items-center rounded-full bg-fg text-xs font-black text-app">MP</span>
            <span aria-hidden="true" className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-app">
              <LiveDot />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-fg">{translate('tc.edu.guideName')}</p>
            <p className="truncate text-xs text-fg-muted">{translate('tc.edu.guideRole')}</p>
          </div>
          <span aria-hidden="true" style={{ background: RED }} className="grid size-10 shrink-0 place-items-center rounded-full text-white">
            <Icon name="trendUp" size={15} />
          </span>
        </div>

        <TrendPath />

        <div className="grid grid-cols-3 gap-2">
          <HeroStat icon="monitor" label={translate('tc.edu.videos')}>
            <CountUp value={COURSE_STATS.videos} format={formatCount} />
          </HeroStat>
          <HeroStat icon="fileText" label={translate('tc.edu.quizzes')}>
            <CountUp value={COURSE_STATS.quizzes} format={formatCount} />
          </HeroStat>
          <div className="flex min-w-0 flex-col gap-3 rounded-[24px] bg-fg/[0.03] p-4 ring-1 ring-line">
            <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
              <Icon name="trophy" size={14} />
            </span>
            <span aria-hidden="true" className="flex h-9 items-end gap-1">
              {['h-3', 'h-5', 'h-8'].map((height, index) => (
                <span
                  key={height}
                  style={{ animationDelay: `${600 + index * 160}ms`, ...(index === 2 ? { background: RED } : {}) }}
                  className={cx('w-2.5 animate-dot-pop rounded-[3px] motion-reduce:animate-none', height, index < 2 && 'bg-fg')}
                />
              ))}
            </span>
            <span className="truncate text-xs text-fg-muted">{translate('tc.edu.allLevels')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// Demo player: no media source exists yet, so playback is simulated against the lesson's published length.
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
  const litDots = Math.round((progress / 100) * SCRUB_DOTS);
  const playLabel = translate(playing ? 'tc.edu.pause' : 'tc.edu.play');

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-[32px] bg-[#0b0b0d] shadow-[0_30px_60px_-34px_rgb(0_0_0/0.7)] ring-1 ring-white/10">
        {/* Pixel field: a 24×12 grid of squares; the columns already played light up, the playhead column is red. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-6 grid grid-cols-24 grid-rows-12 gap-1.5 opacity-70 sm:inset-10">
          {Array.from({ length: 24 * 12 }, (_, cell) => {
            const column = cell % 24;
            const playedColumns = Math.round((progress / 100) * 24);
            const isHead = totalSeconds !== null && elapsed > 0 && column === playedColumns - 1;
            return (
              <span
                key={cell}
                style={{ animationDelay: `${((cell * 37) % 23) * 90}ms`, ...(isHead ? { background: RED } : {}) }}
                className={cx(
                  'rounded-[2px] transition-colors duration-500',
                  isHead ? 'opacity-60' : column < playedColumns ? 'bg-white/[0.14]' : 'zenith-twinkle bg-white/[0.05]',
                )}
              />
            );
          })}
        </div>

        <div className="absolute top-5 left-5 flex max-w-[60%] items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-[11px] font-semibold text-[#0b0b0d]">
          <span style={{ background: RED }} className="grid size-5 shrink-0 place-items-center rounded-full text-white">
            <Icon name="monitor" size={11} />
          </span>
          <span className="truncate">{lesson.title}</span>
        </div>
        <div className="absolute top-5 right-5 text-right">
          <p className="rounded-full border-2 border-emerald-400 px-3 py-0.5 text-[11px] leading-tight font-bold tracking-wide text-white uppercase">{translate('tc.edu.brand')}</p>
          <p className="mt-1 text-[9px] font-semibold tracking-[0.2em] text-white/70 uppercase">{translate('tc.edu.brandTag')}</p>
        </div>

        <div className="absolute inset-0 grid place-items-center">
          {totalSeconds === null ? (
            <div className="flex flex-col items-center gap-3 text-center text-white/80">
              <span className="relative grid size-20 place-items-center">
                <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-white/30 motion-reduce:animate-none" />
                <span className="grid size-14 animate-float place-items-center rounded-full bg-white text-[#0b0b0d] motion-reduce:animate-none">
                  <Icon name="clock" size={24} />
                </span>
              </span>
              <p className="rounded-full bg-white/10 px-3 py-1 text-sm">{translate('tc.edu.videoSoon')}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={playLabel}
              style={{ background: RED }}
              className={cx(
                'relative grid size-20 place-items-center rounded-full text-white shadow-[0_18px_40px_-16px_rgb(0_0_0/0.8)] transition-[transform,opacity] duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-95 motion-reduce:transition-none',
                playing && 'opacity-0 hover:opacity-100 focus-visible:opacity-100',
              )}
            >
              {!playing && (
                <>
                  <span aria-hidden="true" style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />
                  <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-white/40 [animation-delay:0.8s] motion-reduce:hidden" />
                </>
              )}
              <span className="relative translate-x-[1px]">{playing ? <PauseGlyph /> : <PlayGlyph />}</span>
            </button>
          )}
        </div>
      </div>

      {totalSeconds !== null && (
        <div className="flex items-center gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line">
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playLabel}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-app transition-[transform,background-color] duration-200 hover:scale-105 hover:bg-[var(--zenith-red)] hover:text-white focus-visible:outline-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none"
          >
            {playing ? <PauseGlyph size={16} /> : <PlayGlyph size={16} />}
          </button>
          <span className="shrink-0 font-mono text-xs text-fg-muted tabular-nums">
            <span className="font-bold text-fg">{formatClock(elapsed)}</span> / {lesson.videoLength}
          </span>
          <span aria-hidden="true" className="flex h-5 min-w-0 flex-1 items-center gap-[2px]">
            {Array.from({ length: SCRUB_DOTS }, (_, dot) => {
              const isHead = dot === litDots - 1;
              return (
                <span
                  key={dot}
                  style={isHead ? { background: RED } : undefined}
                  className={cx(
                    'min-w-0 flex-1 rounded-[2px] transition-[background-color,height] duration-500',
                    isHead ? 'h-5' : dot < litDots ? 'h-3 bg-fg' : 'h-2 bg-fg/15',
                  )}
                />
              );
            })}
          </span>
          <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-end gap-0.5">
            {playing &&
              [60, 100, 40, 80].map((height, index) => (
                <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 0.15}s`, background: RED }} className="w-0.5 origin-bottom animate-eq-bar rounded-full motion-reduce:animate-none" />
              ))}
          </span>
        </div>
      )}
      {lesson.caption && <p className="border-l-2 border-[var(--zenith-red)] pl-3 text-sm text-fg-muted">{lesson.caption}</p>}
    </div>
  );
}

function QuizStage({ lesson, onComplete }: { lesson: Lesson; onComplete: () => void }) {
  const questions = lesson.quiz ?? [];
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[32px] border border-dashed border-line-strong py-14 text-center">
        <span aria-hidden="true" className="relative grid size-20 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-line-strong motion-reduce:animate-none" />
          <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden" />
          <span className={cx(beadClass, 'size-12 animate-float motion-reduce:animate-none')}>
            <Icon name="fileText" size={18} />
          </span>
        </span>
        <p className="text-sm font-semibold text-fg">{translate('tc.edu.quizUnavailable')}</p>
        {lesson.quizQuestionCount && (
          <p className="flex items-center gap-2 font-mono text-xs text-fg-muted">
            <span aria-hidden="true" className="flex gap-0.5">
              {Array.from({ length: lesson.quizQuestionCount }, (_, cell) => (
                <span key={cell} style={{ animationDelay: `${cell * 150}ms` }} className="zenith-twinkle size-2 rounded-[2px] bg-fg/25" />
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-1.5 pl-1.5 ring-1 ring-line">
          <p className="flex items-center gap-2.5 text-base font-bold text-fg">
            <span aria-hidden="true" className="relative grid size-10 place-items-center rounded-full bg-success text-white">
              <span className="absolute -inset-0.5 animate-ring-ripple rounded-full border-2 border-success/60 motion-reduce:hidden" />
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
              <li key={item.prompt} style={staggerStyle(index, 80)} className="flex animate-feed-in flex-col gap-3 rounded-[26px] bg-fg/[0.03] p-4 ring-1 ring-line motion-reduce:animate-none">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-3xl leading-none font-black tracking-tighter text-fg tabular-nums">Q{pad2(index + 1)}</span>
                  <span className={captionClass}>
                    {translate('tc.edu.question')} {index + 1} {translate('tc.edu.of')} {questions.length}
                  </span>
                </div>
                <p className="text-sm font-bold text-fg">{item.prompt}</p>
                {answerIndex !== null && (
                  <p className="mt-auto flex items-center gap-2 rounded-full bg-fg/[0.05] py-1 pr-3 pl-1 text-sm text-fg-muted">
                    <span style={{ background: RED }} className="grid size-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-black text-white">
                      {OPTION_LETTERS[answerIndex]}
                    </span>
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
        {/* Segmented capsule track: one clickable segment per question — answered solid, current red. */}
        <div className="flex gap-1.5">
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
                style={isCurrent ? { background: RED } : undefined}
                className={cx(
                  'group/seg relative h-3 min-w-0 flex-1 rounded-full transition-[background-color,height] duration-300 hover:h-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  isCurrent ? 'h-4' : isAnswered ? 'bg-fg' : 'bg-fg/12 hover:bg-fg/25',
                )}
              >
                <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold text-fg-subtle opacity-0 transition-opacity group-hover/seg:opacity-100 group-focus-visible/seg:opacity-100">
                  {index + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div key={current} className="animate-rise motion-reduce:animate-none">
        <h3 className="text-3xl leading-tight font-black tracking-tight text-fg">{question.prompt}</h3>
        <p className="mt-1.5 flex items-center gap-2 text-xs text-fg-muted">
          <span aria-hidden="true" style={{ background: RED }} className="size-1.5 rounded-[2px]" />
          {translate('tc.edu.selectOne')}
        </p>

        <div role="radiogroup" aria-label={question.prompt} className="mt-5 flex flex-col gap-2">
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
                  'group flex animate-feed-in items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 text-left text-sm font-medium transition-[background-color,color,box-shadow,translate] duration-300 hover:translate-x-1 focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.99] motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-x-0',
                  selected ? 'bg-fg text-app' : 'bg-fg/[0.03] text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
                )}
              >
                <span
                  style={selected ? { background: RED } : undefined}
                  className={cx(
                    'grid size-10 shrink-0 place-items-center rounded-full font-mono text-base font-black transition-[transform,background-color] duration-300 group-hover:-rotate-12 motion-reduce:transition-none',
                    selected ? 'text-white' : 'bg-fg/10 text-fg',
                  )}
                >
                  {OPTION_LETTERS[optionIndex]}
                </span>
                <span className="min-w-0 flex-1">{option}</span>
                <span aria-hidden="true" className={cx('grid size-6 shrink-0 place-items-center rounded-full transition-colors', selected ? 'bg-app text-fg' : 'border border-dashed border-line-strong')}>
                  {selected && <Icon name="check" size={12} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
        <button type="button" disabled={current === 0} onClick={() => setCurrent((index) => index - 1)} className={outlinePillClass}>
          <Icon name="arrowLeft" size={15} />
          {translate('tc.edu.previous')}
        </button>
        {isLast ? (
          <InkButton disabled={!allAnswered} onClick={submit} className="pr-1.5">
            {translate('tc.edu.submitReview')}
            <span aria-hidden="true" style={{ background: RED }} className="grid size-8 place-items-center rounded-full text-white">
              <Icon name="checkCircle" size={14} />
            </span>
          </InkButton>
        ) : (
          <InkButton onClick={() => setCurrent((index) => index + 1)} className="pr-1.5">
            {translate('tc.edu.next')}
            <span aria-hidden="true" style={{ background: RED }} className="grid size-8 place-items-center rounded-full text-white transition-transform duration-300 group-hover/ink:translate-x-0.5">
              <Icon name="arrowRight" size={14} />
            </span>
          </InkButton>
        )}
      </div>
    </div>
  );
}

/** Two big capsule tabs; the active one fills solid and its icon bead turns red. */
function ModeTabs({ mode, onChange }: { mode: StageMode; onChange: (mode: StageMode) => void }) {
  return (
    <div role="tablist" className="grid grid-cols-2 gap-2">
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
              'group/mode flex items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-bold transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98]',
              isActive ? 'bg-fg text-app' : 'bg-fg/[0.03] text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
            )}
          >
            <span
              aria-hidden="true"
              style={isActive ? { background: RED } : undefined}
              className={cx('grid size-9 shrink-0 place-items-center rounded-full transition-[background-color,transform] duration-300 group-hover/mode:scale-110', isActive ? 'text-white' : 'bg-fg/10')}
            >
              <Icon name={item.icon} size={15} />
            </span>
            <span className="truncate">{translate(item.labelKey)}</span>
            {isActive && <span aria-hidden="true" style={{ background: RED }} className="ml-auto size-2 animate-dot-pop rounded-[2px] motion-reduce:animate-none" />}
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
    <section style={staggerStyle(2, 200)} className="flex min-w-0 animate-rise flex-col gap-6 motion-reduce:animate-none" aria-label={lesson.title}>
      <header className="flex flex-wrap items-end gap-4 border-b border-line pb-5">
        <span className="font-mono text-6xl leading-[0.85] font-black tracking-tighter text-fg tabular-nums sm:text-7xl">{lessonNumber}</span>
        <div className="min-w-0 flex-1 pb-1">
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" style={{ background: RED }} className="size-1.5 rounded-[2px]" />
            {translate('tc.edu.module')} {module.id} · {module.title}
          </p>
          <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-fg">{lesson.title}</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-fg/[0.05] px-2.5 py-0.5 text-xs text-fg-muted">
            <Icon name={mode === 'video' ? 'monitor' : 'fileText'} size={12} />
            {translate(mode === 'video' ? 'tc.edu.video' : 'tc.edu.quiz')}
          </p>
        </div>
        <InkButton disabled={!hasNext} onClick={onNext} className="pr-1.5">
          {translate('tc.edu.nextLesson')}
          <span aria-hidden="true" style={{ background: RED }} className="grid size-8 place-items-center rounded-full text-white transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
            <Icon name="arrowRight" size={14} />
          </span>
        </InkButton>
      </header>

      <ModeTabs mode={mode} onChange={onModeChange} />

      {mode === 'video' ? <VideoStage key={lesson.id} lesson={lesson} onComplete={onComplete} /> : <QuizStage key={lesson.id} lesson={lesson} onComplete={onComplete} />}
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
      <div className="flex flex-col gap-4 rounded-[30px] border border-dashed border-line-strong p-5">
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
            {completedCount}
            <span className="text-base text-fg-subtle">/{totalLessons}</span>
          </p>
        </div>
        {/* Lesson matrix: one pixel per lesson, grouped by module — done solid, the lesson open now red and pulsing. */}
        <div aria-hidden="true" className="flex flex-wrap gap-x-2.5 gap-y-1.5">
          {courseModules.map((module) => (
            <span key={module.id} className="flex gap-1">
              {module.lessons.length === 0 ? (
                <span className="size-3 rounded-[3px] border border-dashed border-line-strong" />
              ) : (
                module.lessons.map((lesson, lessonIndex) => {
                  const isNow = activeModuleId === module.id && activeLessonId === lesson.id;
                  const isDone = isLessonDone(completed, lesson.id);
                  return (
                    <span
                      key={lesson.id}
                      style={{ animationDelay: `${module.id * 80 + lessonIndex * 40}ms`, ...(isNow ? { background: RED } : {}) }}
                      className={cx('size-3 animate-dot-pop rounded-[3px] transition-colors duration-500 motion-reduce:animate-none', isNow ? 'zenith-blink' : isDone ? 'bg-fg' : 'bg-fg/12')}
                    />
                  );
                })
              )}
            </span>
          ))}
        </div>
        <span className="relative h-1.5 overflow-hidden rounded-full bg-fg/10">
          <span style={{ width: `${completedShare}%`, background: RED }} className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 motion-reduce:transition-none" />
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {courseModules.map((module) => {
          const isOpen = openModuleId === module.id;
          const isActiveModule = activeModuleId === module.id;
          const moduleDone = module.lessons.length > 0 && module.lessons.every((lesson) => isLessonDone(completed, lesson.id));
          const moduleDoneCount = module.lessons.filter((lesson) => isLessonDone(completed, lesson.id)).length;

          return (
            <div
              key={module.id}
              className={cx(
                'overflow-hidden rounded-[26px] ring-1 transition-[background-color,box-shadow] duration-300',
                isOpen || isActiveModule ? 'bg-fg/[0.04] ring-line-strong' : 'bg-fg/[0.02] ring-line hover:ring-line-strong',
              )}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => onToggleModule(module.id)}
                className="flex w-full items-center gap-3 rounded-[26px] py-2 pr-2 pl-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  style={isActiveModule && !moduleDone ? { background: RED } : undefined}
                  className={cx(
                    'grid size-10 shrink-0 place-items-center rounded-[14px] font-mono text-sm font-black transition-colors',
                    moduleDone ? 'bg-success text-white' : isActiveModule ? 'text-white' : 'bg-fg/10 text-fg-muted',
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
                      <span aria-hidden="true" className="flex gap-0.5">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <span key={lesson.id} className={cx('h-1.5 w-2.5 rounded-[1.5px]', lessonIndex < moduleDoneCount ? 'bg-success' : 'bg-fg/15')} />
                        ))}
                      </span>
                    )}
                  </span>
                </span>
                <span aria-hidden="true" className={cx('grid size-8 shrink-0 place-items-center rounded-full transition-[rotate,color,background-color] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 bg-fg text-app' : 'text-fg-subtle ring-1 ring-line')}>
                  <Icon name="plus" size={12} />
                </span>
              </button>

              <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="min-h-0 overflow-hidden">
                  {module.lessons.length === 0 ? (
                    <p className="mx-2 mb-2 flex items-center gap-2 rounded-full border border-dashed border-line-strong px-3 py-2 text-xs text-fg-muted">
                      <Icon name="clock" size={12} />
                      {translate('tc.edu.modulePending')}
                    </p>
                  ) : (
                    <ol className="flex flex-col gap-1 px-2 pb-2">
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
                                className="group flex w-full items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-left text-sm text-fg-muted transition-[background-color,color,translate] duration-200 hover:translate-x-0.5 hover:bg-fg/[0.05] hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                              >
                                <span
                                  className={cx(
                                    'grid size-7 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold tabular-nums',
                                    isDone ? 'bg-success text-white' : 'text-fg-subtle ring-1 ring-line group-hover:bg-fg group-hover:text-app group-hover:ring-fg',
                                  )}
                                >
                                  {isDone ? <Icon name="check" size={11} /> : lessonNumber}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                                <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
                                  {STAGE_MODES.map((step) => (
                                    <span key={step.value} className={cx('size-2 rounded-[2px]', completed.has(`${lesson.id}:${step.value}`) ? 'bg-success' : 'bg-fg/15')} />
                                  ))}
                                </span>
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li key={lesson.id} aria-current="step" className="my-1 animate-rise rounded-[22px] bg-fg p-3 text-app motion-reduce:animate-none">
                            <div className="flex items-center gap-2.5">
                              <span
                                style={isDone ? undefined : { background: RED }}
                                className={cx('relative grid size-9 shrink-0 place-items-center rounded-full font-mono text-[11px] font-black text-white tabular-nums', isDone && 'bg-success')}
                              >
                                {!isDone && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-0.5 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
                                <span className="relative">{isDone ? <Icon name="check" size={13} /> : lessonNumber}</span>
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10.5px] font-semibold tracking-[0.14em] text-app/60 uppercase">
                                  {translate('tc.edu.lesson')} {lessonNumber}
                                </p>
                                <p className="truncate text-sm font-bold" title={lesson.title}>
                                  {lesson.title}
                                </p>
                              </div>
                              <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase', isDone ? 'bg-success text-white' : 'bg-app text-fg')}>
                                {translate(isDone ? 'tc.edu.statusDone' : 'tc.edu.statusNow')}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-1.5">
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
                                      'flex items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-left transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                                      selected ? 'bg-app text-fg' : 'text-app/75 ring-1 ring-app/20 hover:ring-app/40',
                                    )}
                                  >
                                    <span
                                      style={selected ? { background: RED } : undefined}
                                      className={cx('grid size-7 shrink-0 place-items-center rounded-full', selected ? 'text-white' : 'bg-app/15')}
                                    >
                                      <Icon name={step.icon} size={12} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[11px] font-bold">{translate(step.labelKey)}</span>
                                      <span className={cx('block font-mono text-[10px]', selected ? 'text-fg-subtle' : 'text-app/55')}>{meta ?? '—'}</span>
                                    </span>
                                    {stepDone && <Icon name="checkCircle" size={14} className="shrink-0 text-success" />}
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

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="grid gap-8 border-t border-line pt-10 md:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <span aria-hidden="true" className="relative grid size-14 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/30 motion-reduce:animate-none" />
          <span className="absolute inset-0 animate-rim-spin [animation-duration:3.5s] motion-reduce:animate-none">
            <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full" />
          </span>
          <span className={cx(beadClass, 'size-10')}>
            <Icon name="info" size={17} />
          </span>
        </span>
        <h2 className="text-3xl font-black tracking-tight text-fg">{translate('tc.edu.faqTitle')}</h2>
        <p className="text-sm text-fg-muted">{translate('tc.edu.faqHint')}</p>
        <span aria-hidden="true" className="flex gap-1">
          {faqItems.map((item, index) => (
            <span key={item.questionKey} style={openIndex === index ? { background: RED } : undefined} className={cx('h-2 w-6 rounded-[2px] transition-colors duration-300', openIndex !== index && 'bg-fg/15')} />
          ))}
        </span>
      </div>

      <ol className="flex flex-col gap-2">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <li key={item.questionKey} className={cx('min-w-0 rounded-[26px] ring-1 transition-[background-color,box-shadow] duration-300', isOpen ? 'bg-fg/[0.05] ring-line-strong' : 'bg-fg/[0.02] ring-line hover:ring-line-strong')}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center gap-3 rounded-[26px] py-2 pr-2 pl-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span
                  aria-hidden="true"
                  style={isOpen ? { background: RED } : undefined}
                  className={cx('relative grid size-10 shrink-0 place-items-center rounded-[14px] font-mono text-xs font-black tabular-nums transition-colors duration-300', isOpen ? 'text-white' : 'bg-fg/10 text-fg-muted')}
                >
                  {isOpen && <span style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-[16px] border-2 motion-reduce:hidden" />}
                  Q{pad2(index + 1)}
                </span>
                <span className="flex-1 text-sm font-bold text-fg">{translate(item.questionKey)}</span>
                <span aria-hidden="true" className={cx('grid size-8 shrink-0 place-items-center rounded-full transition-[rotate,color,background-color] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 bg-fg text-app' : 'text-fg-subtle ring-1 ring-line')}>
                  <Icon name="plus" size={12} />
                </span>
              </button>
              <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <p className="min-h-0 overflow-hidden text-sm leading-relaxed text-fg-muted">
                  <span className="mr-4 mb-4 ml-[3.75rem] block border-l-2 border-[var(--zenith-red)] pl-3">{translate(item.answerKey)}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Modules as a row of capsule tabs; each capsule carries a segmented track that fills with that module's finished lessons. */
function ModuleRail({ activeModuleId, completed, onSelect }: { activeModuleId: number; completed: Set<string>; onSelect: (moduleId: number) => void }) {
  return (
    <nav aria-label={translate('tc.edu.modulesLabel')} style={staggerStyle(1, 150)} className="animate-rise motion-reduce:animate-none">
      <div role="tablist" className="flex gap-2 overflow-x-auto pb-2">
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
                'group zenith-capsule flex min-w-52 flex-1 animate-feed-in flex-col gap-3 rounded-[28px] p-2 pb-3 text-left transition-[background-color,color,box-shadow,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:hover:translate-y-0',
                isActive ? 'bg-fg text-app' : 'bg-fg/[0.03] text-fg ring-1 ring-line hover:ring-line-strong',
              )}
            >
              <span className="flex items-center gap-2.5">
                <span
                  style={isActive && !moduleDone ? { background: RED } : undefined}
                  className={cx(
                    'relative grid size-11 shrink-0 place-items-center rounded-full font-mono text-sm font-black transition-transform duration-300 group-hover:-rotate-6',
                    moduleDone ? 'bg-success text-white' : isActive ? 'text-white' : 'bg-fg/10 text-fg-muted',
                  )}
                >
                  {isActive && !moduleDone && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
                  <span className="relative">{moduleDone ? <Icon name="check" size={15} /> : pad2(module.id)}</span>
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className={cx('text-[10.5px] font-semibold tracking-[0.14em] uppercase', isActive ? 'text-app/60' : 'text-fg-subtle')}>
                    {translate('tc.edu.module')} {module.id}
                  </span>
                  <span className={cx('truncate text-sm font-bold', !isActive && 'text-fg-muted group-hover:text-fg')}>{module.title}</span>
                </span>
              </span>
              <span className="flex items-center gap-2 px-1.5">
                <span aria-hidden="true" className="flex min-w-0 flex-1 gap-1">
                  {Array.from({ length: segments }, (_, segment) => (
                    <span
                      key={segment}
                      className={cx(
                        'h-1.5 min-w-0 flex-1 rounded-full transition-colors duration-500',
                        module.lessons.length === 0
                          ? cx('border border-dashed', isActive ? 'border-app/30' : 'border-line-strong')
                          : segment < doneLessons
                            ? 'bg-success'
                            : isActive
                              ? 'bg-app/20'
                              : 'bg-fg/12',
                      )}
                    />
                  ))}
                </span>
                {module.lessons.length > 0 && (
                  <span className={cx('shrink-0 font-mono text-[10px]', isActive ? 'text-app/60' : 'text-fg-subtle')}>
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

function ModulePendingStage({ module }: { module: CourseModule }) {
  return (
    <section aria-label={module.title} className="flex min-w-0 animate-rise flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-line-strong px-6 py-16 text-center motion-reduce:animate-none">
      <span className="relative grid size-28 place-items-center">
        <DotRing value={0} dots={24} offClass="bg-fg/20 zenith-twinkle" />
        <span aria-hidden="true" className="absolute inset-4 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
        <span className={cx(beadClass, 'size-14 font-mono text-2xl font-black')}>{pad2(module.id)}</span>
        <span aria-hidden="true" style={{ background: RED }} className="absolute top-1 right-3 size-3 animate-ping-soft rounded-[3px] motion-reduce:animate-none" />
      </span>
      <p className={captionClass}>
        {translate('tc.edu.module')} {module.id}
      </p>
      <h2 className="text-3xl font-black tracking-tight text-fg">{module.title}</h2>
      <p className="inline-flex max-w-sm items-center gap-2 rounded-full bg-fg/[0.05] px-3 py-1 text-sm text-fg-muted">
        <Icon name="clock" size={13} />
        {translate('tc.edu.modulePending')}
      </p>
    </section>
  );
}

// Skeleton: open title → hero band (story | guide + trend + stats) → module capsule tabs → lesson stage beside the course map → FAQ → disclaimer.
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
    <div className="flex flex-col gap-10">
      <header className="zenith-tile flex items-end gap-4 border-b border-line pb-6">
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-10')}>
            <Icon name="compass" size={16} />
          </span>
          <span aria-hidden="true" style={{ background: RED }} className="absolute top-0.5 right-0.5 size-2.5 rounded-full" />
        </span>
        <h1 className="min-w-0 truncate text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.tcEducation')}</h1>
      </header>

      <CourseHero />

      <div className="border-t border-line pt-8">
        <ModuleRail activeModuleId={activeModuleId} completed={completed} onSelect={selectModule} />
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
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

      <FaqSection />

      <footer className="flex gap-4 rounded-[30px] border border-dashed border-line-strong p-5 text-[11px] leading-relaxed text-fg-subtle">
        <span aria-hidden="true" style={{ background: RED }} className="grid size-9 shrink-0 place-items-center rounded-full text-white">
          <Icon name="fileText" size={15} />
        </span>
        <ol className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph, index) => (
            <li key={paragraph} className="flex gap-2.5">
              <span aria-hidden="true" className="font-mono text-[10px] font-bold text-[var(--zenith-red)]">
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
