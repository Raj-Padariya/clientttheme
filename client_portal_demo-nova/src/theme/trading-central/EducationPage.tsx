'use client';

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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

// Decorative candles for the hero (y-coords: smaller is higher), a steady uptrend for a TA course, drawn as a dot matrix.
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
const CANDLE_ROWS = 12;
const CANDLE_TOP = 28;
const CANDLE_BOTTOM = 112;
const CANDLE_STEP = (CANDLE_BOTTOM - CANDLE_TOP) / (CANDLE_ROWS - 1);

const totalLessons = courseModules.reduce((sum, module) => sum + module.lessons.length, 0);

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
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

/** Dark ink pill with the Nova shine sweep. */
function InkButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'group/ink relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-fg px-5 text-sm font-semibold text-app transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/ink:translate-x-full motion-reduce:hidden" />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

/** Progress as a ring of dots: `value` percent of them are lit. */
function DotRing({ value, dots, litClass = 'bg-fg', offClass = 'bg-fg/15', dotSize = 'size-1.5' }: { value: number; dots: number; litClass?: string; offClass?: string; dotSize?: string }) {
  const litCount = Math.round((Math.min(100, Math.max(0, value)) / 100) * dots);
  return (
    <span aria-hidden="true" className="absolute inset-0">
      {Array.from({ length: dots }, (_, dot) => {
        const angle = (dot / dots) * 2 * Math.PI - Math.PI / 2;
        return (
          <span
            key={dot}
            style={{ left: `${50 + 47 * Math.cos(angle)}%`, top: `${50 + 47 * Math.sin(angle)}%` }}
            className={cx('absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-500', dotSize, dot < litCount ? litClass : offClass)}
          />
        );
      })}
    </span>
  );
}

function DotCandles() {
  return (
    <div aria-hidden="true" className="grid grid-cols-10 justify-items-center gap-1">
      {HERO_CANDLES.map((candle, index) => {
        const isUp = candle.close < candle.open;
        const bodyTop = Math.min(candle.open, candle.close) - CANDLE_STEP / 2;
        const bodyBottom = Math.max(candle.open, candle.close) + CANDLE_STEP / 2;
        return (
          <span key={`${candle.open}-${candle.close}`} className="flex flex-col gap-1">
            {Array.from({ length: CANDLE_ROWS }, (_, row) => {
              const y = CANDLE_TOP + row * CANDLE_STEP;
              const inBody = y >= bodyTop && y <= bodyBottom;
              const inWick = y >= candle.high - CANDLE_STEP / 2 && y <= candle.low + CANDLE_STEP / 2;
              return (
                <span key={row} className="grid size-2.5 place-items-center">
                  <span
                    style={{ animationDelay: `${index * 70 + row * 18}ms` }}
                    className={cx(
                      'animate-dot-pop rounded-full motion-reduce:animate-none',
                      inBody ? (isUp ? 'size-2.5 bg-fg' : 'size-2.5 border border-fg/70') : inWick ? 'size-1.5 bg-fg/55' : 'size-1 bg-fg/[0.08]',
                    )}
                  />
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
}

function HeroStat({ icon, children, label }: { icon: IconName; children: ReactNode; label: string }) {
  return (
    <div className="group flex flex-col items-center gap-2 text-center">
      <span className="relative grid size-14 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-line-strong transition-colors group-hover:animate-rim-spin group-hover:border-fg/40 motion-reduce:group-hover:animate-none" />
        <span className={cx(beadClass, 'size-11 font-mono text-lg font-black tabular-nums')}>{children}</span>
      </span>
      <span className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Icon name={icon} size={12} />
        {label}
      </span>
    </div>
  );
}

function CourseHero() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <FrostCard className="h-full">
          <div className="flex h-full flex-col gap-4 text-[#0a1220] sm:p-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', frostChipClass)}>
                <LiveDot />
                {translate('tc.edu.eyebrow')}
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-[#0a1220]/20 transition-colors hover:bg-[#0a1220] hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon name="info" size={13} />
                {translate('tc.edu.help')}
              </button>
            </div>
            <h2 className="mt-auto text-4xl leading-[1.05] font-black tracking-[-0.03em] sm:text-5xl">{translate('tc.edu.title')}</h2>
            <p className="text-sm leading-relaxed font-medium text-[#3b4658]">{translate('tc.edu.intro1')}</p>
            <p className="mt-auto border-t border-dotted border-[#0a1220]/25 pt-4 text-sm leading-relaxed font-medium text-[#3b4658]">{translate('tc.edu.intro2')}</p>
          </div>
      </FrostCard>

      <section style={staggerStyle(1, 140)} className={cx(panelClass, 'flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none')}>
        <div className="flex items-center gap-3">
          <span className="relative grid size-12 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
            <span className="grid size-10 place-items-center rounded-full bg-fg text-sm font-black text-app">MP</span>
            <span aria-hidden="true" className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-surface">
              <LiveDot />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-fg">{translate('tc.edu.guideName')}</p>
            <p className="truncate text-xs text-fg-muted">{translate('tc.edu.guideRole')}</p>
          </div>
          <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
            <Icon name="trendUp" size={14} />
          </span>
        </div>

        <div className="rounded-[22px] border border-dashed border-line-strong px-4 py-3">
          <DotCandles />
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-dotted border-line-strong pt-4">
          <HeroStat icon="monitor" label={translate('tc.edu.videos')}>
            <CountUp value={COURSE_STATS.videos} format={formatCount} />
          </HeroStat>
          <HeroStat icon="fileText" label={translate('tc.edu.quizzes')}>
            <CountUp value={COURSE_STATS.quizzes} format={formatCount} />
          </HeroStat>
          <div className="flex flex-col items-center gap-2 text-center">
            <span aria-hidden="true" className="flex h-14 items-end justify-center gap-1.5 pb-2">
              {['size-2', 'size-3', 'size-4'].map((size, index) => (
                <span key={size} style={{ animationDelay: `${600 + index * 160}ms` }} className={cx('animate-dot-pop rounded-full bg-fg motion-reduce:animate-none', size)} />
              ))}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-fg-muted">
              <Icon name="trophy" size={12} />
              {translate('tc.edu.allLevels')}
            </span>
          </div>
        </div>
      </section>
    </div>
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
      <div className="relative aspect-video overflow-hidden rounded-[28px] bg-[#05070b] shadow-[0_30px_60px_-34px_rgb(0_0_0/0.9)] ring-1 ring-white/10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.09)_1px,transparent_1px)] bg-[size:14px_14px] [mask-image:radial-gradient(circle_at_50%_50%,#000,transparent_80%)]" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />

        <div className="absolute top-5 left-5 flex max-w-[60%] items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/10 backdrop-blur">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white text-[#05070b]">
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
                <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-white/30 motion-reduce:animate-none" />
                <span className="grid size-14 animate-float place-items-center rounded-full bg-white/10 ring-1 ring-white/15 motion-reduce:animate-none">
                  <Icon name="clock" size={24} />
                </span>
              </span>
              <p className="text-sm">{translate('tc.edu.videoSoon')}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={playLabel}
              className={cx(
                'relative grid size-20 place-items-center rounded-full bg-white text-[#05070b] shadow-[0_18px_40px_-16px_rgb(0_0_0/0.9)] transition-[transform,opacity] duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none',
                playing && 'opacity-0 hover:opacity-100 focus-visible:opacity-100',
              )}
            >
              {!playing && (
                <>
                  <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-white/60 motion-reduce:hidden" />
                  <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-white/40 [animation-delay:0.8s] motion-reduce:hidden" />
                </>
              )}
              <span className="relative translate-x-[1px]">{playing ? <PauseGlyph /> : <PlayGlyph />}</span>
            </button>
          )}
        </div>
      </div>

      {totalSeconds !== null && (
        <div className="flex items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 ring-1 ring-line">
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playLabel}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-app transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            {playing ? <PauseGlyph size={16} /> : <PlayGlyph size={16} />}
          </button>
          <span className="shrink-0 font-mono text-xs text-fg-muted tabular-nums">
            <span className="font-bold text-fg">{formatClock(elapsed)}</span> / {lesson.videoLength}
          </span>
          <span aria-hidden="true" className="flex min-w-0 flex-1 items-center justify-between gap-0.5">
            {Array.from({ length: SCRUB_DOTS }, (_, dot) => (
              <span
                key={dot}
                className={cx(
                  'shrink-0 rounded-full transition-[background-color,width,height] duration-500',
                  dot === litDots - 1 ? 'size-2.5 bg-fg' : dot < litDots ? 'size-1.5 bg-fg' : 'size-1.5 bg-fg/15',
                )}
              />
            ))}
          </span>
          <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-end gap-0.5">
            {playing &&
              [60, 100, 40, 80].map((height, index) => (
                <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 0.15}s` }} className="w-0.5 origin-bottom animate-eq-bar rounded-full bg-fg motion-reduce:animate-none" />
              ))}
          </span>
        </div>
      )}
      {lesson.caption && <p className="border-l border-dotted border-fg/40 pl-3 text-sm text-fg-muted">{lesson.caption}</p>}
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
      <div className="flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-line-strong py-14 text-center">
        <span aria-hidden="true" className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-11 animate-float motion-reduce:animate-none')}>
            <Icon name="fileText" size={18} />
          </span>
        </span>
        <p className="text-sm font-medium text-fg">{translate('tc.edu.quizUnavailable')}</p>
        {lesson.quizQuestionCount && (
          <p className="font-mono text-xs text-fg-muted">
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
          <p className="flex items-center gap-2.5 text-base font-bold text-fg">
            <span aria-hidden="true" className="relative grid size-9 place-items-center rounded-full bg-success/15 text-success">
              <span className="absolute inset-0 animate-ring-ripple rounded-full border border-success/50 motion-reduce:hidden" />
              <Icon name="checkCircle" size={17} />
            </span>
            {translate('tc.edu.reviewTitle')}
          </p>
          <button type="button" onClick={retake} className={outlinePillClass}>
            <Icon name="refresh" size={15} />
            {translate('tc.edu.retake')}
          </button>
        </div>
        <ol className="flex flex-col gap-2">
          {questions.map((item, index) => {
            const answerIndex = answers[index];
            return (
              <li key={item.prompt} style={staggerStyle(index, 80)} className="grid animate-feed-in grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[22px] p-4 ring-1 ring-line motion-reduce:animate-none">
                <span className={cx(beadClass, 'size-10 font-mono text-xs font-black')}>Q{pad2(index + 1)}</span>
                <div className="flex min-w-0 flex-col gap-2">
                  <p className={captionClass}>
                    {translate('tc.edu.question')} {index + 1} {translate('tc.edu.of')} {questions.length}
                  </p>
                  <p className="text-sm font-bold text-fg">{item.prompt}</p>
                  {answerIndex !== null && (
                    <p className="flex items-center gap-2 border-t border-dotted border-line-strong pt-2 text-sm text-fg-muted">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-fg font-mono text-[11px] font-black text-app">{OPTION_LETTERS[answerIndex]}</span>
                      {item.options[answerIndex]}
                    </p>
                  )}
                </div>
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
        <p className={captionClass}>
          {translate('tc.edu.question')} {current + 1} {translate('tc.edu.of')} {questions.length}
        </p>
        <div className="relative flex items-center gap-2">
          <span aria-hidden="true" className="absolute inset-x-4 top-1/2 border-t border-dotted border-line-strong" />
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
                  'relative grid size-9 place-items-center rounded-full font-mono text-xs font-bold tabular-nums transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                  isCurrent ? 'bg-fg text-app' : isAnswered ? 'nova-gloss text-fg' : 'bg-surface text-fg-subtle ring-1 ring-line hover:text-fg',
                )}
              >
                {isCurrent && <span aria-hidden="true" className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-fg/40 motion-reduce:animate-none" />}
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div key={current} className="animate-rise motion-reduce:animate-none">
        <h3 className="text-2xl font-bold tracking-tight text-fg">{question.prompt}</h3>
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
                  'group flex animate-feed-in items-center gap-3 rounded-[22px] p-3.5 text-left text-sm font-medium transition-[background-color,color,box-shadow,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
                  selected ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
                )}
              >
                <span
                  className={cx(
                    'grid size-10 shrink-0 place-items-center rounded-full font-mono text-base font-black transition-transform duration-300 group-hover:-rotate-12 motion-reduce:transition-none',
                    selected ? 'bg-app text-fg' : 'nova-gloss text-fg',
                  )}
                >
                  {OPTION_LETTERS[optionIndex]}
                </span>
                <span className="min-w-0 flex-1">{option}</span>
                <span aria-hidden="true" className={cx('grid size-5 shrink-0 place-items-center rounded-full transition-colors', selected ? 'bg-app text-fg' : 'border border-dashed border-line-strong')}>
                  {selected && <Icon name="check" size={11} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-dotted border-line-strong pt-4">
        <button type="button" disabled={current === 0} onClick={() => setCurrent((index) => index - 1)} className={outlinePillClass}>
          <Icon name="arrowLeft" size={15} />
          {translate('tc.edu.previous')}
        </button>
        {isLast ? (
          <InkButton disabled={!allAnswered} onClick={submit}>
            {translate('tc.edu.submitReview')}
            <Icon name="checkCircle" size={15} />
          </InkButton>
        ) : (
          <InkButton onClick={() => setCurrent((index) => index + 1)}>
            {translate('tc.edu.next')}
            <Icon name="arrowRight" size={15} />
          </InkButton>
        )}
      </div>
    </div>
  );
}

function ModeTabs({ mode, onChange }: { mode: StageMode; onChange: (mode: StageMode) => void }) {
  return (
    <div role="tablist" className="relative grid grid-cols-2 rounded-full p-1 ring-1 ring-line">
      <span
        aria-hidden="true"
        className={cx(
          'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-fg transition-transform duration-500 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none',
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
              'relative flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
              isActive ? 'text-app' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon name={item.icon} size={15} />
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
    <section style={staggerStyle(2, 200)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-5 p-5 motion-reduce:animate-none')} aria-label={lesson.title}>
      <header className="flex flex-wrap items-center gap-4">
        <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className="grid size-12 place-items-center rounded-full bg-fg font-mono text-xl font-black text-app tabular-nums">{lessonNumber}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className={captionClass}>
            {translate('tc.edu.module')} {module.id} · {module.title}
          </p>
          <h2 className="mt-1 truncate text-2xl font-bold tracking-tight text-fg">{lesson.title}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
            <Icon name={mode === 'video' ? 'monitor' : 'fileText'} size={12} />
            {translate(mode === 'video' ? 'tc.edu.video' : 'tc.edu.quiz')}
          </p>
        </div>
        <InkButton disabled={!hasNext} onClick={onNext} className="pr-1.5">
          {translate('tc.edu.nextLesson')}
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-app text-fg transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
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
  const ringDots = Math.min(Math.max(totalLessons, 12), 36);

  return (
    <aside style={staggerStyle(3, 200)} className="flex min-w-0 animate-rise flex-col gap-4 xl:sticky xl:top-24 xl:self-start motion-reduce:animate-none">
      <div className={cx(panelClass, 'flex items-center gap-4 p-4')}>
        <span className="relative grid size-20 shrink-0 place-items-center">
          <DotRing value={(completedCount / Math.max(1, totalLessons)) * 100} dots={ringDots} />
          <span className="font-mono text-sm font-black text-fg tabular-nums">
            {completedCount}/{totalLessons}
          </span>
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-fg">
            <Icon name="compass" size={15} />
            {translate('tc.edu.courseMap')}
          </h2>
          <p className="mt-1 text-[11px] text-fg-subtle">{translate('tc.edu.completedOf')}</p>
        </div>
      </div>

      <div className={cx(panelClass, 'flex flex-col p-2')}>
        {courseModules.map((module) => {
          const isOpen = openModuleId === module.id;
          const isActiveModule = activeModuleId === module.id;
          const moduleDone = module.lessons.length > 0 && module.lessons.every((lesson) => isLessonDone(completed, lesson.id));

          return (
            <div key={module.id} className={cx('rounded-[22px] transition-colors', isActiveModule && 'bg-fg/[0.04]')}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => onToggleModule(module.id)}
                className="flex w-full items-center gap-3 rounded-[22px] px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  className={cx(
                    'grid size-9 shrink-0 place-items-center rounded-full font-mono text-sm font-black transition-colors',
                    moduleDone ? 'bg-success/15 text-success' : isActiveModule ? 'bg-fg text-app' : 'nova-gloss text-fg-muted',
                  )}
                >
                  {moduleDone ? <Icon name="check" size={14} /> : module.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-fg">{module.title}</span>
                  <span className="block font-mono text-[10px] text-fg-subtle">
                    {translate('tc.edu.module')} {module.id}
                    {module.lessons.length > 0 && ` · ${module.lessons.length} ${translate('tc.edu.lessons')}`}
                  </span>
                </span>
                <span aria-hidden="true" className={cx('grid size-7 shrink-0 place-items-center rounded-full ring-1 transition-[rotate,color,box-shadow] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 text-fg ring-fg/40' : 'text-fg-subtle ring-line')}>
                  <Icon name="plus" size={12} />
                </span>
              </button>

              <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="min-h-0 overflow-hidden">
                  {module.lessons.length === 0 ? (
                    <p className="mx-3 mb-3 rounded-[16px] border border-dashed border-line-strong px-3 py-2.5 text-xs text-fg-muted">{translate('tc.edu.modulePending')}</p>
                  ) : (
                    <ol className="relative ml-[1.85rem] flex flex-col gap-1 border-l border-dotted border-line-strong pr-2 pb-3 pl-3">
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
                                className="group flex w-full items-center gap-2.5 rounded-full py-1.5 pr-2 pl-1 text-left text-sm text-fg-muted transition-colors hover:bg-fg/[0.04] hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                              >
                                <span
                                  className={cx(
                                    'grid size-6 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold tabular-nums',
                                    isDone ? 'bg-success/15 text-success' : 'text-fg-subtle ring-1 ring-line group-hover:ring-line-strong',
                                  )}
                                >
                                  {isDone ? <Icon name="check" size={11} /> : lessonNumber}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                                <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
                                  {STAGE_MODES.map((step) => (
                                    <span key={step.value} className={cx('size-1.5 rounded-full', completed.has(`${lesson.id}:${step.value}`) ? 'bg-success' : 'bg-fg/15')} />
                                  ))}
                                </span>
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li key={lesson.id} aria-current="step" className="my-1 animate-rise rounded-[20px] bg-fg/[0.05] p-3 ring-1 ring-line-strong motion-reduce:animate-none">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={cx(
                                  'relative grid size-8 shrink-0 place-items-center rounded-full font-mono text-[11px] font-black tabular-nums',
                                  isDone ? 'bg-success/15 text-success' : 'bg-fg text-app',
                                )}
                              >
                                {!isDone && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-fg/50 motion-reduce:hidden" />}
                                <span className="relative">{isDone ? <Icon name="check" size={13} /> : lessonNumber}</span>
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={captionClass}>
                                  {translate('tc.edu.lesson')} {lessonNumber}
                                </p>
                                <p className="truncate text-sm font-bold text-fg" title={lesson.title}>
                                  {lesson.title}
                                </p>
                              </div>
                              <span
                                className={cx(
                                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                                  isDone ? 'bg-success/15 text-success' : 'bg-fg text-app',
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
                                      'flex items-center gap-2 rounded-[16px] p-2 text-left transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                                      selected ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:ring-line-strong',
                                    )}
                                  >
                                    <span className={cx('grid size-7 shrink-0 place-items-center rounded-full', selected ? 'bg-app text-fg' : 'nova-gloss text-fg')}>
                                      <Icon name={step.icon} size={12} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[11px] font-bold">{translate(step.labelKey)}</span>
                                      <span className={cx('block font-mono text-[10px]', selected ? 'text-app/70' : 'text-fg-subtle')}>{meta ?? '—'}</span>
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
    <section className={cx(panelClass, 'grid gap-6 p-5 sm:p-6 md:grid-cols-[16rem_minmax(0,1fr)]')}>
      <div className="flex flex-col gap-3">
        <span aria-hidden="true" className="relative grid size-14 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-10')}>
            <Icon name="info" size={17} />
          </span>
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-fg">{translate('tc.edu.faqTitle')}</h2>
        <p className="text-sm text-fg-muted">{translate('tc.edu.faqHint')}</p>
      </div>

      <ol className="flex flex-col gap-2">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;
          const isLast = index === faqItems.length - 1;
          return (
            <li key={item.questionKey} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3">
              {!isLast && <span aria-hidden="true" className="absolute top-10 bottom-[-0.5rem] left-[1.125rem] border-l border-dotted border-line-strong" />}
              <span aria-hidden="true" className={cx('relative mt-1.5 grid size-9 place-items-center rounded-full font-mono text-xs font-black tabular-nums transition-colors duration-300', isOpen ? 'bg-fg text-app' : 'nova-gloss text-fg-muted')}>
                {isOpen && <span className="absolute inset-0 animate-ring-ripple rounded-full border border-fg/40 motion-reduce:hidden" />}
                Q{pad2(index + 1)}
              </span>
              <div className={cx('min-w-0 rounded-[22px] ring-1 transition-[background-color,box-shadow] duration-300', isOpen ? 'bg-fg/[0.04] ring-line-strong' : 'ring-transparent hover:ring-line')}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center gap-3 rounded-[22px] px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="flex-1 text-sm font-bold text-fg">{translate(item.questionKey)}</span>
                  <span aria-hidden="true" className={cx('grid size-7 shrink-0 place-items-center rounded-full ring-1 transition-[rotate,color,box-shadow] duration-300 motion-reduce:transition-none', isOpen ? 'rotate-45 text-fg ring-fg/40' : 'text-fg-subtle ring-line')}>
                    <Icon name="plus" size={12} />
                  </span>
                </button>
                <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <p className="min-h-0 overflow-hidden px-4 text-sm leading-relaxed text-fg-muted">
                    <span className="block border-t border-dotted border-line-strong pt-3 pb-4">{translate(item.answerKey)}</span>
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Modules strung on one dotted line; each bead's dot ring fills with that module's finished lessons. */
function ModuleRail({ activeModuleId, completed, onSelect }: { activeModuleId: number; completed: Set<string>; onSelect: (moduleId: number) => void }) {
  return (
    <nav aria-label={translate('tc.edu.modulesLabel')} style={staggerStyle(1, 150)} className={cx(panelClass, 'animate-rise px-3 py-5 motion-reduce:animate-none')}>
      <div role="tablist" className="relative flex overflow-x-auto pb-1">
        {courseModules.map((module, index) => {
          const isActive = module.id === activeModuleId;
          const doneLessons = module.lessons.filter((lesson) => isLessonDone(completed, lesson.id)).length;
          const moduleDone = module.lessons.length > 0 && doneLessons === module.lessons.length;
          const progress = module.lessons.length > 0 ? (doneLessons / module.lessons.length) * 100 : 0;
          const isFirst = index === 0;
          const isLast = index === courseModules.length - 1;

          return (
            <button
              key={module.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(module.id)}
              style={staggerStyle(index, 90)}
              className="group relative flex min-w-36 flex-1 animate-feed-in flex-col items-center gap-2.5 px-2 text-center focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none"
            >
              <span aria-hidden="true" className={cx('absolute top-8 border-t border-dotted border-line-strong', isFirst ? 'left-1/2' : 'left-0', isLast ? 'right-1/2' : 'right-0')} />
              <span className="relative grid size-16 place-items-center rounded-full bg-surface">
                <DotRing value={progress} dots={16} litClass={moduleDone ? 'bg-success' : 'bg-fg'} />
                {isActive && <span aria-hidden="true" className="absolute inset-2 animate-rim-spin rounded-full border border-dashed border-fg/40 motion-reduce:animate-none" />}
                <span
                  className={cx(
                    'relative grid size-10 place-items-center rounded-full font-mono text-sm font-black transition-[background-color,color,translate] duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none',
                    isActive ? 'bg-fg text-app' : moduleDone ? 'bg-success/15 text-success' : 'nova-gloss text-fg-muted group-hover:text-fg',
                  )}
                >
                  {moduleDone ? <Icon name="check" size={15} /> : pad2(module.id)}
                </span>
              </span>
              <span className="flex w-full min-w-0 flex-col">
                <span className={captionClass}>
                  {translate('tc.edu.module')} {module.id}
                </span>
                <span className={cx('truncate text-sm font-bold transition-colors', isActive ? 'text-fg' : 'text-fg-muted group-hover:text-fg')}>{module.title}</span>
                {module.lessons.length > 0 && (
                  <span className="font-mono text-[10px] text-fg-subtle">
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
    <section aria-label={module.title} className="flex min-w-0 animate-rise flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-line-strong px-6 py-16 text-center motion-reduce:animate-none">
      <span className="relative grid size-28 place-items-center">
        <DotRing value={0} dots={24} offClass="bg-fg/20" />
        <span aria-hidden="true" className="absolute inset-4 animate-rim-spin rounded-full border border-dashed border-fg/30 motion-reduce:animate-none" />
        <span className={cx(beadClass, 'size-14 font-mono text-2xl font-black')}>{pad2(module.id)}</span>
      </span>
      <p className={captionClass}>
        {translate('tc.edu.module')} {module.id}
      </p>
      <h2 className="text-2xl font-bold tracking-tight text-fg">{module.title}</h2>
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
      <header className="flex animate-rise items-center gap-4 motion-reduce:animate-none">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-9')}>
            <Icon name="compass" size={15} />
          </span>
        </span>
        <h1 className="min-w-0 truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.tcEducation')}</h1>
      </header>

      <CourseHero />

      <ModuleRail activeModuleId={activeModuleId} completed={completed} onSelect={selectModule} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
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

      <footer className={cx(panelClass, 'flex gap-4 border border-dashed border-line-strong p-5 text-[11px] leading-relaxed text-fg-subtle')}>
        <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
          <Icon name="fileText" size={15} />
        </span>
        <ol className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph, index) => (
            <li key={paragraph} className="flex gap-2.5">
              <span aria-hidden="true" className="font-mono text-[10px] font-bold text-fg-muted">
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
