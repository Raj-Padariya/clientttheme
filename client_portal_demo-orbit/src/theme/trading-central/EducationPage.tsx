'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { disclaimerParagraphs } from './economicEvents';
import { COURSE_STATS, courseModules, type CourseModule, type Lesson } from './educationCourse';

type StageMode = 'video' | 'quiz';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SIMULATED_TICK_MS = 1000;
const SCRUB_TICKS = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const eyebrow = 'text-[10px] font-semibold tracking-[0.16em] uppercase';

const faqItems: { questionKey: MessageKey; answerKey: MessageKey }[] = [
  { questionKey: 'tc.edu.faq.checkmarks.q', answerKey: 'tc.edu.faq.checkmarks.a' },
  { questionKey: 'tc.edu.faq.practice.q', answerKey: 'tc.edu.faq.practice.a' },
  { questionKey: 'tc.edu.faq.patterns.q', answerKey: 'tc.edu.faq.patterns.a' },
];

const STAGE_MODES: { value: StageMode; labelKey: MessageKey; icon: IconName }[] = [
  { value: 'video', labelKey: 'tc.edu.watchVideo', icon: 'monitor' },
  { value: 'quiz', labelKey: 'tc.edu.takeQuiz', icon: 'fileText' },
];

// Decorative candle chart for the hero (SVG y-coords: smaller is higher), a steady uptrend for a TA course.
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
const candleCenter = (index: number) => 21 + index * 23;
const HERO_TREND = HERO_CANDLES.map((candle, index) => `${index === 0 ? 'M' : 'L'}${candleCenter(index)} ${candle.close}`).join(' ');
const HERO_LAST = HERO_CANDLES[HERO_CANDLES.length - 1];

const totalLessons = courseModules.reduce((sum, module) => sum + module.lessons.length, 0);

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

/** Progress ring; `pathLength` keeps the dash maths in percent regardless of radius. */
function ProgressRing({ value, size, radius, done = false, children }: { value: number; size: number; radius: number; done?: boolean; children: ReactNode }) {
  const center = size / 2;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth="3" className="stroke-line" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - value}
          stroke={done ? 'var(--color-success)' : 'var(--brand-primary)'}
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

function CandleBoard() {
  return (
    <div aria-hidden="true" className="relative rounded-2xl border border-line bg-fg/[0.02] p-4">
      <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary">
        <Icon name="trendUp" size={12} />
      </span>
      <svg viewBox="0 0 240 130" className="h-44 w-full overflow-visible">
        {[30, 60, 90, 120].map((y) => (
          <line key={y} x1="0" x2="240" y1={y} y2={y} strokeDasharray="2 5" className="stroke-line" />
        ))}
        {HERO_CANDLES.map((candle, index) => {
          const isUp = candle.close < candle.open;
          const top = Math.min(candle.open, candle.close);
          const center = candleCenter(index);
          return (
            <g
              key={center}
              style={{ animationDelay: `${index * 90}ms` }}
              className="origin-bottom animate-[grow-y_0.7s_ease-out_both] [transform-box:fill-box] motion-reduce:animate-none"
            >
              <line x1={center} x2={center} y1={candle.high} y2={candle.low} stroke="var(--brand-primary)" strokeOpacity="0.55" strokeWidth="1.5" />
              <rect
                x={center - 5}
                y={top}
                width="10"
                height={Math.max(2, Math.abs(candle.open - candle.close))}
                rx="1.5"
                fill={isUp ? 'var(--brand-primary)' : 'transparent'}
                fillOpacity={isUp ? 0.85 : 0}
                stroke="var(--brand-primary)"
                strokeWidth="1.5"
              />
            </g>
          );
        })}
        <path
          d={HERO_TREND}
          pathLength={100}
          strokeDasharray="100"
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="6"
          strokeOpacity="0.25"
          strokeLinecap="round"
          className="animate-line-draw blur-[3px] motion-reduce:animate-none"
        />
        <path
          d={HERO_TREND}
          pathLength={100}
          strokeDasharray="100"
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-line-draw motion-reduce:animate-none"
        />
        <circle
          cx={candleCenter(HERO_CANDLES.length - 1)}
          cy={HERO_LAST.close}
          r="6"
          fill="var(--brand-primary)"
          fillOpacity="0.35"
          className="origin-center animate-ping-soft [transform-box:fill-box] motion-reduce:animate-none"
        />
        <circle cx={candleCenter(HERO_CANDLES.length - 1)} cy={HERO_LAST.close} r="3" fill="var(--brand-primary)" />
      </svg>
    </div>
  );
}

function HeroStat({ icon, children, label }: { icon: IconName; children: ReactNode; label: string }) {
  return (
    <div className="group flex items-center gap-3 px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-fg/[0.03] text-primary transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-2xl leading-none font-semibold text-fg tabular-nums">{children}</p>
        <p className="mt-1 text-xs text-fg-muted">{label}</p>
      </div>
    </div>
  );
}

function CourseHero() {
  return (
    <section className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-0 -z-10 size-96 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <LiveDot />
              {translate('tc.edu.eyebrow')}
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-primary/40 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon name="info" size={14} />
              {translate('tc.edu.help')}
            </button>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{translate('tc.edu.title')}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">{translate('tc.edu.intro1')}</p>
          <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">{translate('tc.edu.intro2')}</p>
        </div>
        <CandleBoard />
      </div>

      <div className="grid divide-y divide-line border-t border-line sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] xl:divide-x">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/40 bg-primary/15 text-sm font-semibold text-primary">
            MP
            <span aria-hidden="true" className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-surface">
              <LiveDot />
            </span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{translate('tc.edu.guideName')}</p>
            <p className="truncate text-xs text-fg-muted">{translate('tc.edu.guideRole')}</p>
          </div>
        </div>
        <HeroStat icon="monitor" label={translate('tc.edu.videos')}>
          <CountUp value={COURSE_STATS.videos} format={formatCount} />
        </HeroStat>
        <HeroStat icon="fileText" label={translate('tc.edu.quizzes')}>
          <CountUp value={COURSE_STATS.quizzes} format={formatCount} />
        </HeroStat>
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Icon name="trophy" size={17} />
          </span>
          <span className="text-sm font-medium text-fg">{translate('tc.edu.allLevels')}</span>
          <span aria-hidden="true" className="ml-auto flex h-5 items-end gap-0.5">
            {[40, 70, 100].map((height, index) => (
              <span key={height} style={{ height: `${height}%`, ...staggerStyle(index, 200) }} className="w-1.5 origin-bottom animate-rise rounded-full bg-primary motion-reduce:animate-none" />
            ))}
          </span>
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
  const playLabel = translate(playing ? 'tc.edu.pause' : 'tc.edu.play');

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-primary/25 bg-neutral-950 shadow-[0_30px_60px_-40px_var(--brand-primary)]">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0 opacity-30" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/4 size-80 animate-drift rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -bottom-24 size-64 animate-drift rounded-full bg-primary/15 blur-3xl [animation-delay:-8s] motion-reduce:animate-none"
        />
        {/* Viewfinder corners frame the stage instead of a plain rounded box. */}
        <span aria-hidden="true" className="absolute top-3 left-3 size-5 rounded-tl-md border-t-2 border-l-2 border-white/25" />
        <span aria-hidden="true" className="absolute top-3 right-3 size-5 rounded-tr-md border-t-2 border-r-2 border-white/25" />
        <span aria-hidden="true" className="absolute bottom-3 left-3 size-5 rounded-bl-md border-b-2 border-l-2 border-white/25" />
        <span aria-hidden="true" className="absolute right-3 bottom-3 size-5 rounded-br-md border-r-2 border-b-2 border-white/25" />

        <div className="absolute top-6 left-6 flex max-w-[60%] items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
          <Icon name="monitor" size={12} className="shrink-0" />
          <span className="truncate">{lesson.title}</span>
        </div>
        <div className="absolute top-6 right-6 text-right">
          <p className="rounded-full border-2 border-emerald-400 px-3 py-0.5 text-[11px] leading-tight font-bold tracking-wide text-white uppercase">{translate('tc.edu.brand')}</p>
          <p className="mt-1 text-[9px] font-semibold tracking-[0.2em] text-white/70 uppercase">{translate('tc.edu.brandTag')}</p>
        </div>

        <div className="absolute inset-0 grid place-items-center">
          {totalSeconds === null ? (
            <div className="flex flex-col items-center gap-3 text-center text-white/80">
              <span className="grid size-16 animate-float place-items-center rounded-2xl border border-white/15 bg-white/10 motion-reduce:animate-none">
                <Icon name="clock" size={26} />
              </span>
              <p className="text-sm">{translate('tc.edu.videoSoon')}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={playLabel}
              className={cx(
                'relative grid size-20 place-items-center rounded-2xl border border-white/25 bg-primary/35 text-white backdrop-blur-md transition-[transform,opacity] duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-white motion-reduce:transition-none',
                playing && 'opacity-0 hover:opacity-100 focus-visible:opacity-100',
              )}
            >
              {!playing && <span aria-hidden="true" className="absolute -inset-2 animate-pulse-ring rounded-[1.4rem] border border-primary/60 motion-reduce:animate-none" />}
              <span className="relative">{playing ? <PauseGlyph /> : <PlayGlyph />}</span>
            </button>
          )}
        </div>

        {totalSeconds !== null && (
          <span aria-hidden="true" style={{ width: `${progress}%` }} className="absolute bottom-0 left-0 h-0.5 bg-primary shadow-[0_0_10px_var(--brand-primary)] transition-[width] duration-1000 ease-linear motion-reduce:transition-none" />
        )}
      </div>

      {totalSeconds !== null && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-fg/[0.03] p-2 pr-4">
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playLabel}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary shadow-[0_8px_20px_-10px_var(--brand-primary)] transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            {playing ? <PauseGlyph size={16} /> : <PlayGlyph size={16} />}
          </button>
          <span className="shrink-0 font-mono text-xs text-fg-muted tabular-nums">
            <span className="text-fg">{formatClock(elapsed)}</span> / {lesson.videoLength}
          </span>
          <div aria-hidden="true" className="relative h-3 min-w-0 flex-1">
            <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-fg/10" />
            {SCRUB_TICKS.map((tick) => (
              <span key={tick} style={{ left: `${tick}%` }} className="absolute top-0 h-3 w-px bg-line-strong" />
            ))}
            <span style={{ width: `${progress}%` }} className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-primary transition-[width] duration-1000 ease-linear motion-reduce:transition-none" />
            <span
              style={{ left: `${progress}%` }}
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)] ring-2 ring-white/80 transition-[left] duration-1000 ease-linear motion-reduce:transition-none"
            />
          </div>
          <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-end gap-0.5">
            {playing &&
              [60, 100, 40, 80].map((height, index) => (
                <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 0.15}s` }} className="w-0.5 origin-bottom animate-eq-bar rounded-full bg-primary motion-reduce:animate-none" />
              ))}
          </span>
        </div>
      )}
      {lesson.caption && <p className="border-l-2 border-primary/50 pl-3 text-sm text-fg-muted">{lesson.caption}</p>}
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
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong py-14 text-center">
        <span className="grid size-14 animate-float place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary motion-reduce:animate-none">
          <Icon name="fileText" size={24} />
        </span>
        <p className="text-sm font-medium text-fg">{translate('tc.edu.quizUnavailable')}</p>
        {lesson.quizQuestionCount && (
          <p className="text-xs text-fg-muted">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-base font-semibold text-fg">
            <Icon name="checkCircle" size={18} className="text-success" />
            {translate('tc.edu.reviewTitle')}
          </p>
          <Button variant="secondary" onClick={retake}>
            <Icon name="refresh" size={16} />
            {translate('tc.edu.retake')}
          </Button>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {questions.map((item, index) => {
            const answerIndex = answers[index];
            return (
              <li key={item.prompt} style={staggerStyle(index, 80)} className="flex animate-rise flex-col gap-2 rounded-2xl border border-line bg-fg/[0.025] p-4 motion-reduce:animate-none">
                <p className="flex items-center gap-2">
                  <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">Q{pad2(index + 1)}</span>
                  <span className={cx(eyebrow, 'text-fg-subtle')}>
                    {translate('tc.edu.question')} {index + 1} {translate('tc.edu.of')} {questions.length}
                  </span>
                </p>
                <p className="text-sm font-semibold text-fg">{item.prompt}</p>
                {answerIndex !== null && (
                  <p className="mt-auto flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/[0.07] p-2.5 text-sm text-fg-muted">
                    <span className="font-mono text-sm font-semibold text-primary">{OPTION_LETTERS[answerIndex]}</span>
                    {item.options[answerIndex]}
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cx(eyebrow, 'text-fg-subtle')}>
          {translate('tc.edu.question')} {current + 1} {translate('tc.edu.of')} {questions.length}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((item, index) => {
            const isAnswered = answers[index] !== null;
            return (
              <button
                key={item.prompt}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`${translate('tc.edu.question')} ${index + 1}`}
                aria-current={index === current ? 'step' : undefined}
                className={cx(
                  'grid size-8 place-items-center rounded-lg border font-mono text-xs font-semibold tabular-nums transition-[background-color,border-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                  isAnswered ? 'border-primary/40 bg-primary/15 text-primary' : 'border-line text-fg-subtle hover:text-fg',
                  index === current && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
                )}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div key={current} className="animate-rise motion-reduce:animate-none">
        <h3 className="text-xl font-semibold text-fg">{question.prompt}</h3>
        <p className="mt-1 text-xs text-fg-muted">{translate('tc.edu.selectOne')}</p>

        <div role="radiogroup" aria-label={question.prompt} className="mt-4 grid gap-3 sm:grid-cols-2">
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
                  'group flex min-h-24 animate-rise flex-col gap-2 rounded-2xl border p-4 text-left text-sm transition-[background-color,border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
                  selected
                    ? 'border-primary/55 bg-primary/[0.12] text-fg shadow-[0_14px_30px_-20px_var(--brand-primary)]'
                    : 'border-line bg-fg/[0.02] text-fg-muted hover:border-line-strong hover:text-fg',
                )}
              >
                <span className="flex items-center justify-between">
                  <span className={cx('font-mono text-2xl leading-none font-semibold transition-colors', selected ? 'text-primary' : 'text-fg-subtle group-hover:text-primary/70')}>
                    {OPTION_LETTERS[optionIndex]}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cx('grid size-5 place-items-center rounded-full border transition-colors', selected ? 'border-primary bg-primary text-on-primary' : 'border-line-strong')}
                  >
                    {selected && <Icon name="check" size={12} />}
                  </span>
                </span>
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((index) => index - 1)}>
          <Icon name="arrowLeft" size={16} />
          {translate('tc.edu.previous')}
        </Button>
        {isLast ? (
          <Button disabled={!allAnswered} onClick={submit}>
            {translate('tc.edu.submitReview')}
            <Icon name="checkCircle" size={16} />
          </Button>
        ) : (
          <Button onClick={() => setCurrent((index) => index + 1)}>
            {translate('tc.edu.next')}
            <Icon name="arrowRight" size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

function ModeTabs({ mode, onChange }: { mode: StageMode; onChange: (mode: StageMode) => void }) {
  return (
    <div role="tablist" className="relative grid grid-cols-2 border-b border-line">
      <span
        aria-hidden="true"
        className={cx(
          'absolute bottom-0 left-0 h-0.5 w-1/2 bg-primary shadow-[0_0_12px_var(--brand-primary)] transition-transform duration-300 ease-out motion-reduce:transition-none',
          mode === 'quiz' && 'translate-x-full',
        )}
      />
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
              'flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              isActive ? 'bg-primary/[0.06] text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon name={item.icon} size={15} className={isActive ? 'text-primary' : undefined} />
            {translate(item.labelKey)}
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
    <section style={staggerStyle(1, 250)} className="orbit-card min-w-0 animate-rise overflow-hidden lg:order-2 motion-reduce:animate-none" aria-label={lesson.title}>
      <header className="flex flex-wrap items-center gap-4 px-5 pt-5 pb-4">
        <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-2xl border border-primary/40 bg-primary/12 font-mono text-2xl font-semibold text-primary">
          {lessonNumber}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cx(eyebrow, 'text-primary')}>
            {translate('tc.edu.module')} {module.id} · {module.title}
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-fg">{lesson.title}</h2>
          <p className="text-xs text-fg-muted">{translate(mode === 'video' ? 'tc.edu.video' : 'tc.edu.quiz')}</p>
        </div>
        <Button variant="secondary" disabled={!hasNext} onClick={onNext} className="group/next">
          {translate('tc.edu.nextLesson')}
          <Icon name="arrowRight" size={16} className="transition-transform duration-200 group-hover/next:translate-x-0.5" />
        </Button>
      </header>

      <ModeTabs mode={mode} onChange={onModeChange} />

      <div className="p-5">
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

  return (
    <aside style={staggerStyle(2, 250)} className="flex min-w-0 animate-rise flex-col gap-4 lg:sticky lg:top-24 lg:order-1 lg:self-start motion-reduce:animate-none">
      <div className="orbit-card flex items-center gap-4 p-4">
        <ProgressRing value={(completedCount / Math.max(1, totalLessons)) * 100} size={64} radius={28}>
          <span className="font-mono text-xs font-semibold text-fg tabular-nums">
            {completedCount}/{totalLessons}
          </span>
        </ProgressRing>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Icon name="compass" size={16} className="text-primary" />
            {translate('tc.edu.courseMap')}
          </h2>
          <p className="mt-1 text-[11px] text-fg-subtle">{translate('tc.edu.completedOf')}</p>
        </div>
      </div>

      <div className="orbit-card overflow-hidden">
        {courseModules.map((module) => {
          const isOpen = openModuleId === module.id;
          const isActiveModule = activeModuleId === module.id;
          const moduleDone = module.lessons.length > 0 && module.lessons.every((lesson) => isLessonDone(completed, lesson.id));

          return (
            <div key={module.id} className={cx('border-b border-line transition-colors last:border-b-0', isActiveModule && 'bg-primary/[0.04]')}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => onToggleModule(module.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  className={cx(
                    'grid size-8 shrink-0 place-items-center rounded-lg border font-mono text-sm font-semibold transition-colors',
                    moduleDone
                      ? 'border-success/30 bg-success/15 text-success'
                      : isActiveModule
                        ? 'border-primary/50 bg-primary/15 text-primary'
                        : 'border-line text-fg-muted',
                  )}
                >
                  {moduleDone ? <Icon name="check" size={15} /> : module.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{module.title}</span>
                  <span className="block text-[11px] text-fg-subtle">
                    {translate('tc.edu.module')} {module.id}
                    {module.lessons.length > 0 && ` · ${module.lessons.length} ${translate('tc.edu.lessons')}`}
                  </span>
                </span>
                <Icon name="chevronDown" size={16} className={cx('text-fg-subtle transition-transform duration-300', isOpen && 'rotate-180 text-primary')} />
              </button>

              <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="min-h-0 overflow-hidden">
                  {module.lessons.length === 0 ? (
                    <p className="px-4 pb-4 text-xs text-fg-muted">{translate('tc.edu.modulePending')}</p>
                  ) : (
                    <ol className="flex flex-col gap-0.5 px-2 pb-3">
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
                                className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                              >
                                <span className={cx('w-6 shrink-0 font-mono text-[11px] font-semibold tabular-nums', isDone ? 'text-success' : 'text-fg-subtle group-hover:text-primary')}>
                                  {isDone ? <Icon name="check" size={14} /> : lessonNumber}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                                <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
                                  {STAGE_MODES.map((step) => (
                                    <Icon
                                      key={step.value}
                                      name={step.icon}
                                      size={12}
                                      className={completed.has(`${lesson.id}:${step.value}`) ? 'text-success' : 'text-fg-subtle/50'}
                                    />
                                  ))}
                                </span>
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li key={lesson.id} aria-current="step" className="my-1 animate-rise rounded-xl border border-primary/40 bg-primary/[0.08] p-3 shadow-[0_16px_32px_-24px_var(--brand-primary)] motion-reduce:animate-none">
                            <div className="flex items-center gap-3">
                              <span
                                className={cx(
                                  'relative grid size-8 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-bold tabular-nums',
                                  isDone ? 'bg-success/20 text-success' : 'bg-primary/25 text-primary',
                                )}
                              >
                                {!isDone && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-lg bg-primary/30 motion-reduce:animate-none" />}
                                <span className="relative">{isDone ? <Icon name="check" size={14} /> : lessonNumber}</span>
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={cx(eyebrow, 'text-primary')}>
                                  {translate('tc.edu.lesson')} {lessonNumber}
                                </p>
                                <p className="truncate text-sm font-semibold text-fg" title={lesson.title}>
                                  {lesson.title}
                                </p>
                              </div>
                              <span
                                className={cx(
                                  'shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                                  isDone ? 'border-success/30 bg-success/15 text-success' : 'border-primary/40 bg-primary/15 text-primary',
                                )}
                              >
                                {translate(isDone ? 'tc.edu.statusDone' : 'tc.edu.statusNow')}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
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
                                      'flex items-center gap-2 rounded-lg border p-2 text-left transition-[background-color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                                      selected ? 'border-primary/50 bg-surface' : 'border-line bg-surface/50 hover:border-line-strong',
                                    )}
                                  >
                                    <Icon name={step.icon} size={14} className={selected ? 'text-primary' : 'text-fg-muted'} />
                                    <span className="min-w-0 flex-1">
                                      <span className={cx('block truncate text-[11px] font-semibold', selected ? 'text-fg' : 'text-fg-muted')}>{translate(step.labelKey)}</span>
                                      <span className="block text-[10px] text-fg-subtle">{meta ?? '—'}</span>
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
    <section className="orbit-card flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
          <Icon name="info" size={20} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-fg">{translate('tc.edu.faqTitle')}</h2>
          <p className="text-sm text-fg-muted">{translate('tc.edu.faqHint')}</p>
        </div>
      </div>

      <div className="grid items-start gap-3 md:grid-cols-3">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={item.questionKey}
              className={cx('rounded-2xl border transition-[background-color,border-color] duration-300', isOpen ? 'border-primary/40 bg-primary/[0.07]' : 'border-line bg-fg/[0.02]')}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-start gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="font-mono text-xs font-semibold text-primary">Q{pad2(index + 1)}</span>
                <span className="flex-1 text-sm font-semibold text-fg">{translate(item.questionKey)}</span>
                <span
                  aria-hidden="true"
                  className={cx(
                    'relative grid size-6 shrink-0 place-items-center rounded-lg border transition-[transform,border-color,color] duration-300 motion-reduce:transition-none',
                    isOpen ? 'rotate-45 border-primary/50 text-primary' : 'border-line text-fg-subtle',
                  )}
                >
                  <span className="absolute h-px w-2.5 bg-current" />
                  <span className="absolute h-2.5 w-px bg-current" />
                </span>
              </button>
              <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <p className="min-h-0 overflow-hidden px-4 text-sm leading-relaxed text-fg-muted">
                  <span className="block pb-4">{translate(item.answerKey)}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ModuleRail({ activeModuleId, completed, onSelect }: { activeModuleId: number; completed: Set<string>; onSelect: (moduleId: number) => void }) {
  return (
    <nav aria-label={translate('tc.edu.modulesLabel')} style={staggerStyle(1, 150)} className="animate-rise motion-reduce:animate-none">
      <div role="tablist" style={{ gridTemplateColumns: `repeat(${courseModules.length}, minmax(12rem, 1fr))` }} className="grid gap-3 overflow-x-auto pb-1">
        {courseModules.map((module) => {
          const isActive = module.id === activeModuleId;
          const doneLessons = module.lessons.filter((lesson) => isLessonDone(completed, lesson.id)).length;
          const moduleDone = module.lessons.length > 0 && doneLessons === module.lessons.length;
          const progress = module.lessons.length > 0 ? (doneLessons / module.lessons.length) * 100 : 0;

          return (
            <button
              key={module.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(module.id)}
              className={cx(
                'group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition-[background-color,border-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                isActive
                  ? 'border-primary/50 bg-primary/[0.1] shadow-[0_16px_34px_-24px_var(--brand-primary)]'
                  : moduleDone
                    ? 'border-success/30 bg-fg/[0.02]'
                    : 'border-line bg-fg/[0.02] hover:border-line-strong',
              )}
            >
              {isActive && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-primary to-transparent" />}
              <ProgressRing value={progress} size={44} radius={18} done={moduleDone}>
                <span className={cx('font-mono text-sm font-semibold', moduleDone ? 'text-success' : isActive ? 'text-primary' : 'text-fg-muted')}>
                  {moduleDone ? <Icon name="check" size={15} /> : module.id}
                </span>
              </ProgressRing>
              <span className="min-w-0 flex-1">
                <span className={cx(eyebrow, 'block text-primary')}>
                  {translate('tc.edu.module')} {module.id}
                </span>
                <span className={cx('block truncate text-sm font-semibold transition-colors', isActive ? 'text-fg' : 'text-fg-muted group-hover:text-fg')}>{module.title}</span>
                {module.lessons.length > 0 && (
                  <span className="block text-[11px] text-fg-subtle">
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
    <section
      aria-label={module.title}
      className="flex min-w-0 animate-rise flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center lg:order-2 motion-reduce:animate-none"
    >
      <span className="relative grid size-24 place-items-center">
        <span aria-hidden="true" className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute inset-3 rounded-full bg-primary/10" />
        <span className="relative font-mono text-3xl font-semibold text-primary">{pad2(module.id)}</span>
      </span>
      <p className={cx(eyebrow, 'text-primary')}>
        {translate('tc.edu.module')} {module.id}
      </p>
      <h2 className="text-xl font-semibold text-fg">{module.title}</h2>
      <p className="max-w-sm text-sm text-fg-muted">{translate('tc.edu.modulePending')}</p>
    </section>
  );
}

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
      <PageHeader title={translate('nav.tcEducation')} />

      <CourseHero />

      <ModuleRail activeModuleId={activeModuleId} completed={completed} onSelect={selectModule} />

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
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

      <footer className="orbit-card flex gap-4 p-5 text-[11px] leading-relaxed text-fg-subtle">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-fg/[0.03] text-fg-muted">
          <Icon name="fileText" size={16} />
        </span>
        <div className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </footer>
    </div>
  );
}
