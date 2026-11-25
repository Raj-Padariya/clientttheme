'use client';

import { useEffect, useRef, useState } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { disclaimerParagraphs } from './economicEvents';
import { COURSE_STATS, courseModules, type CourseModule, type Lesson } from './educationCourse';

type StageMode = 'video' | 'quiz';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SIMULATED_TICK_MS = 1000;

const faqItems: { questionKey: MessageKey; answerKey: MessageKey }[] = [
  { questionKey: 'tc.edu.faq.checkmarks.q', answerKey: 'tc.edu.faq.checkmarks.a' },
  { questionKey: 'tc.edu.faq.practice.q', answerKey: 'tc.edu.faq.practice.a' },
  { questionKey: 'tc.edu.faq.patterns.q', answerKey: 'tc.edu.faq.patterns.a' },
];

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

function GuideCard() {
  return (
    <div style={staggerStyle(1, 200)} className="glass flex animate-rise flex-col gap-4 rounded-xl p-5 motion-reduce:animate-none">
      <div className="flex items-center gap-4">
        <span className="relative grid size-16 shrink-0 place-items-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-[spin_8s_linear_infinite] rounded-full bg-[conic-gradient(var(--brand-primary),transparent_55%,var(--brand-primary))] motion-reduce:animate-none"
          />
          <span className="relative grid size-14 place-items-center rounded-full bg-surface text-lg font-semibold text-primary">MP</span>
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-fg">{translate('tc.edu.guideName')}</p>
          <p className="text-xs text-fg-muted">{translate('tc.edu.guideRole')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="group rounded-lg bg-surface-2 p-3 ring-1 ring-line transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none">
          <Icon name="monitor" size={16} className="text-primary transition-transform duration-300 group-hover:scale-110" />
          <p className="mt-2 text-2xl font-semibold tabular-nums text-fg">
            <CountUp value={COURSE_STATS.videos} format={formatCount} />
          </p>
          <p className="text-xs text-fg-muted">{translate('tc.edu.videos')}</p>
        </div>
        <div className="group rounded-lg bg-surface-2 p-3 ring-1 ring-line transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none">
          <Icon name="fileText" size={16} className="text-primary transition-transform duration-300 group-hover:scale-110" />
          <p className="mt-2 text-2xl font-semibold tabular-nums text-fg">
            <CountUp value={COURSE_STATS.quizzes} format={formatCount} />
          </p>
          <p className="text-xs text-fg-muted">{translate('tc.edu.quizzes')}</p>
        </div>
        <div className="col-span-2 flex items-center gap-3 rounded-lg bg-primary-soft px-3 py-2.5 ring-1 ring-primary/30">
          <Icon name="trophy" size={16} className="text-primary" />
          <span className="text-sm font-medium text-fg">{translate('tc.edu.allLevels')}</span>
          <span aria-hidden="true" className="ml-auto flex h-4 items-end gap-0.5">
            {[40, 70, 100].map((height, index) => (
              <span
                key={height}
                style={{ height: `${height}%`, ...staggerStyle(index, 200) }}
                className="w-1.5 origin-bottom animate-rise rounded-full bg-primary motion-reduce:animate-none"
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

function CourseHero() {
  return (
    <section className="kpi-card relative animate-rise overflow-hidden rounded-xl motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-20 size-96 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none"
      />
      <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
              <LiveDot />
              {translate('tc.edu.eyebrow')}
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-fg-muted ring-1 ring-line transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon name="info" size={14} />
              {translate('tc.edu.help')}
            </button>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{translate('tc.edu.title')}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">{translate('tc.edu.intro1')}</p>
          <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">{translate('tc.edu.intro2')}</p>
        </div>
        <GuideCard />
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

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-neutral-950 ring-1 ring-line">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0 opacity-40" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-16 size-72 animate-drift rounded-full bg-primary/30 blur-3xl motion-reduce:animate-none"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -bottom-24 size-64 animate-drift rounded-full bg-sky-500/20 blur-3xl [animation-delay:-8s] motion-reduce:animate-none"
        />

        <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
          <Icon name="monitor" size={12} />
          {lesson.title}
        </div>
        <div className="absolute top-4 right-4 text-right">
          <p className="rounded-full border-2 border-emerald-400 px-3 py-0.5 text-[11px] font-bold uppercase leading-tight tracking-wide text-white">
            {translate('tc.edu.brand')}
          </p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/70">{translate('tc.edu.brandTag')}</p>
        </div>

        <div className="absolute inset-0 grid place-items-center">
          {totalSeconds === null ? (
            <div className="flex flex-col items-center gap-3 text-center text-white/80">
              <span className="grid size-16 animate-float place-items-center rounded-full bg-white/10 motion-reduce:animate-none">
                <Icon name="clock" size={26} />
              </span>
              <p className="text-sm">{translate('tc.edu.videoSoon')}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={translate(playing ? 'tc.edu.pause' : 'tc.edu.play')}
              className={cx(
                'relative grid size-20 place-items-center rounded-full bg-primary text-on-primary shadow-[0_0_48px_-6px_var(--brand-primary)] transition-[transform,opacity] duration-300 hover:scale-110 focus-visible:outline-2 focus-visible:outline-white motion-reduce:transition-none',
                playing && 'opacity-0 hover:opacity-100 focus-visible:opacity-100',
              )}
            >
              {!playing && (
                <>
                  <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-primary/50 motion-reduce:animate-none" />
                  <span aria-hidden="true" className="absolute -inset-3 animate-ring-breathe rounded-full border border-white/20 motion-reduce:animate-none" />
                </>
              )}
              <span className="relative">{playing ? <PauseGlyph /> : <PlayGlyph />}</span>
            </button>
          )}
        </div>

        {totalSeconds !== null && (
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-4 pt-10 pb-3">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/20">
              <span style={{ width: `${progress}%` }} className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-1000 ease-linear" />
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-white">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={translate(playing ? 'tc.edu.pause' : 'tc.edu.play')}
                className="grid size-7 place-items-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
              >
                {playing ? <PauseGlyph size={14} /> : <PlayGlyph size={14} />}
              </button>
              <span className="font-mono tabular-nums">
                {formatClock(elapsed)} / {lesson.videoLength}
              </span>
              {playing && (
                <span aria-hidden="true" className="ml-auto flex h-3 items-end gap-0.5">
                  {[60, 100, 40, 80].map((height, index) => (
                    <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 150}ms` }} className="w-0.5 animate-pulse rounded-full bg-primary" />
                  ))}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      {lesson.caption && <p className="text-sm text-fg-muted">{lesson.caption}</p>}
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
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong py-14 text-center">
        <span className="grid size-14 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
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
        <ol className="flex flex-col gap-3">
          {questions.map((item, index) => {
            const answerIndex = answers[index];
            return (
              <li
                key={item.prompt}
                style={staggerStyle(index, 80)}
                className="animate-rise rounded-lg bg-surface-2 p-4 ring-1 ring-line motion-reduce:animate-none"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  {translate('tc.edu.question')} {index + 1} {translate('tc.edu.of')} {questions.length}
                </p>
                <p className="mt-1 text-sm font-semibold text-fg">{item.prompt}</p>
                {answerIndex !== null && (
                  <p className="mt-2 flex items-start gap-2 text-sm text-fg-muted">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-on-primary">
                      {OPTION_LETTERS[answerIndex]}
                    </span>
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
      <div className="flex items-center gap-1.5">
        {questions.map((item, index) => (
          <button
            key={item.prompt}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`${translate('tc.edu.question')} ${index + 1}`}
            aria-current={index === current ? 'step' : undefined}
            className={cx(
              'h-1.5 flex-1 rounded-full transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
              answers[index] !== null ? 'bg-primary' : 'bg-surface-2',
              index === current && 'shadow-[0_0_0_2px_var(--brand-primary)]',
            )}
          />
        ))}
      </div>

      <div key={current} className="animate-rise motion-reduce:animate-none">
        <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
          {translate('tc.edu.question')} {current + 1} {translate('tc.edu.of')} {questions.length}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-fg">{question.prompt}</h3>
        <p className="mt-1 text-xs text-fg-muted">{translate('tc.edu.selectOne')}</p>

        <div role="radiogroup" aria-label={question.prompt} className="mt-4 grid gap-2.5">
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
                  'group flex animate-rise items-center gap-3 rounded-lg px-4 py-3 text-left text-sm ring-1 transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
                  selected
                    ? 'bg-primary-soft text-fg ring-primary shadow-[0_10px_24px_-14px_var(--brand-primary)]'
                    : 'bg-surface-2 text-fg-muted ring-line hover:text-fg hover:ring-line-strong',
                )}
              >
                <span
                  className={cx(
                    'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors',
                    selected ? 'bg-primary text-on-primary' : 'bg-surface text-fg-subtle ring-1 ring-line group-hover:text-primary',
                  )}
                >
                  {selected ? <Icon name="check" size={14} /> : OPTION_LETTERS[optionIndex]}
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

function ModeSwitch({ mode, onChange }: { mode: StageMode; onChange: (mode: StageMode) => void }) {
  const modes: { value: StageMode; labelKey: MessageKey }[] = [
    { value: 'video', labelKey: 'tc.edu.watchVideo' },
    { value: 'quiz', labelKey: 'tc.edu.takeQuiz' },
  ];

  return (
    <div role="tablist" className="relative grid grid-cols-2 rounded-full bg-surface-2 p-1 ring-1 ring-line">
      <span
        aria-hidden="true"
        className={cx(
          'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary shadow-[0_6px_16px_-6px_var(--brand-primary)] transition-transform duration-300 ease-out motion-reduce:transition-none',
          mode === 'quiz' && 'translate-x-full',
        )}
      />
      {modes.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={mode === item.value}
          onClick={() => onChange(item.value)}
          className={cx(
            'relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
            mode === item.value ? 'text-on-primary' : 'text-fg-muted hover:text-fg',
          )}
        >
          {translate(item.labelKey)}
        </button>
      ))}
    </div>
  );
}

function LessonStage({
  module,
  lesson,
  mode,
  onModeChange,
  hasNext,
  onNext,
  onComplete,
}: {
  module: CourseModule;
  lesson: Lesson;
  mode: StageMode;
  onModeChange: (mode: StageMode) => void;
  hasNext: boolean;
  onNext: () => void;
  onComplete: () => void;
}) {
  return (
    <section
      style={staggerStyle(1, 250)}
      className="glow-border min-w-0 animate-rise rounded-xl bg-surface shadow-card motion-reduce:animate-none"
      aria-label={lesson.title}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
            {translate('tc.edu.module')} {module.id} · {module.title}
          </p>
          <h2 className="mt-0.5 truncate text-lg font-semibold text-fg">{lesson.title}</h2>
          <p className="text-xs text-fg-muted">{translate(mode === 'video' ? 'tc.edu.video' : 'tc.edu.quiz')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModeSwitch mode={mode} onChange={onModeChange} />
          <Button variant="secondary" disabled={!hasNext} onClick={onNext} className="group/next">
            {translate('tc.edu.nextLesson')}
            <Icon name="arrowRight" size={16} className="transition-transform duration-200 group-hover/next:translate-x-0.5" />
          </Button>
        </div>
      </header>

      <div className="p-5">
        {mode === 'video' ? (
          <VideoStage key={lesson.id} lesson={lesson} onComplete={onComplete} />
        ) : (
          <QuizStage key={lesson.id} lesson={lesson} onComplete={onComplete} />
        )}
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
  const completedCount = courseModules.reduce(
    (sum, module) => sum + module.lessons.filter((lesson) => isLessonDone(completed, lesson.id)).length,
    0,
  );

  return (
    <aside style={staggerStyle(2, 250)} className="flex animate-rise flex-col gap-3 lg:sticky lg:top-24 lg:self-start motion-reduce:animate-none">
      <div className="rounded-xl bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Icon name="compass" size={16} className="text-primary" />
            {translate('tc.edu.courseMap')}
          </h2>
          <span className="text-xs tabular-nums text-fg-muted">
            {completedCount}/{totalLessons}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <span
            style={{ width: `${(completedCount / Math.max(1, totalLessons)) * 100}%` }}
            className="block h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none"
          />
        </div>
        <p className="mt-2 text-[11px] text-fg-subtle">{translate('tc.edu.completedOf')}</p>
      </div>

      {courseModules.map((module) => {
        const isOpen = openModuleId === module.id;
        const isActiveModule = activeModuleId === module.id;
        const moduleDone = module.lessons.length > 0 && module.lessons.every((lesson) => isLessonDone(completed, lesson.id));

        return (
          <div key={module.id} className={cx('overflow-hidden rounded-xl bg-surface shadow-card transition-shadow', isActiveModule && 'glow-border')}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => onToggleModule(module.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span
                className={cx(
                  'grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold transition-colors',
                  moduleDone ? 'bg-success text-white' : isActiveModule ? 'bg-primary text-on-primary' : 'bg-surface-2 text-fg-muted',
                )}
              >
                {moduleDone ? <Icon name="check" size={16} /> : module.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{module.title}</span>
                <span className="block text-[11px] text-fg-subtle">
                  {translate('tc.edu.module')} {module.id}
                  {module.lessons.length > 0 && ` · ${module.lessons.length} ${translate('tc.edu.lessons')}`}
                </span>
              </span>
              <Icon name="chevronDown" size={16} className={cx('text-fg-subtle transition-transform duration-300', isOpen && 'rotate-180')} />
            </button>

            <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="min-h-0 overflow-hidden">
                {module.lessons.length === 0 ? (
                  <p className="border-t border-line px-4 py-4 text-xs text-fg-muted">{translate('tc.edu.modulePending')}</p>
                ) : (
                  <ol className="relative flex flex-col gap-1 border-t border-line p-3">
                    <span aria-hidden="true" className="absolute top-7 bottom-7 left-[34px] w-px bg-linear-to-b from-primary/50 via-line to-line" />
                    {module.lessons.map((lesson, lessonIndex) => {
                      const isActive = isActiveModule && activeLessonId === lesson.id;
                      const isDone = isLessonDone(completed, lesson.id);
                      const lessonNumber = String(lessonIndex + 1).padStart(2, '0');

                      if (!isActive) {
                        return (
                          <li key={lesson.id} className="relative">
                            <button
                              type="button"
                              onClick={() => onSelect(module.id, lesson.id, 'video')}
                              className="group flex w-full items-center gap-3 rounded-lg px-1.5 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                            >
                              <span
                                className={cx(
                                  'relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums ring-4 ring-surface transition-[background-color,color,transform] duration-200 group-hover:scale-105 motion-reduce:transition-none',
                                  isDone ? 'bg-success text-white' : 'bg-surface-2 text-fg-subtle group-hover:text-primary',
                                )}
                              >
                                {isDone ? <Icon name="check" size={14} /> : lessonNumber}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                              <Icon
                                name="chevronRight"
                                size={14}
                                className="text-fg-subtle opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                              />
                            </button>
                          </li>
                        );
                      }

                      return (
                        <li key={lesson.id} aria-current="step" className="relative z-10 my-1 animate-rise motion-reduce:animate-none">
                          <div className="relative overflow-hidden rounded-xl bg-surface p-3 shadow-[0_16px_32px_-20px_var(--brand-primary)] ring-1 ring-primary/50">
                            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary-soft via-primary-soft/40 to-transparent" />
                            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                            <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary" />

                            <div className="relative flex items-center gap-3">
                              <span
                                className={cx(
                                  'relative grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums',
                                  isDone ? 'bg-success text-white' : 'bg-primary text-on-primary',
                                )}
                              >
                                {!isDone && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-primary/40 motion-reduce:animate-none" />}
                                <span className="relative">{isDone ? <Icon name="check" size={14} /> : lessonNumber}</span>
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-primary">
                                  {translate('tc.edu.lesson')} {lessonNumber}
                                </p>
                                <p className="truncate text-sm font-semibold text-fg" title={lesson.title}>
                                  {lesson.title}
                                </p>
                              </div>
                              <span
                                className={cx(
                                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                  isDone ? 'bg-success/15 text-success' : 'bg-primary text-on-primary',
                                )}
                              >
                                {translate(isDone ? 'tc.edu.statusDone' : 'tc.edu.statusNow')}
                              </span>
                            </div>

                            <div className="relative mt-3 grid grid-cols-2 gap-2">
                              {(['video', 'quiz'] as const).map((itemMode) => {
                                const selected = mode === itemMode;
                                const stepDone = completed.has(`${lesson.id}:${itemMode}`);
                                const meta =
                                  itemMode === 'video'
                                    ? lesson.videoMinutes
                                      ? `${lesson.videoMinutes} ${translate('tc.edu.min')}`
                                      : null
                                    : lesson.quizQuestionCount
                                      ? `${lesson.quizQuestionCount} ${translate('tc.edu.questions')}`
                                      : null;
                                return (
                                  <button
                                    key={itemMode}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => onSelect(module.id, lesson.id, itemMode)}
                                    className={cx(
                                      'group/tile flex flex-col gap-2 rounded-lg p-2.5 text-left ring-1 transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                                      selected ? 'bg-surface shadow-[0_8px_18px_-12px_var(--brand-primary)] ring-primary' : 'bg-surface/60 ring-line hover:ring-line-strong',
                                    )}
                                  >
                                    <span className="flex items-center justify-between">
                                      <span
                                        className={cx(
                                          'grid size-7 place-items-center rounded-md transition-colors duration-200',
                                          selected ? 'bg-primary text-on-primary' : 'bg-surface-2 text-fg-muted group-hover/tile:text-primary',
                                        )}
                                      >
                                        <Icon name={itemMode === 'video' ? 'monitor' : 'fileText'} size={14} />
                                      </span>
                                      {stepDone && <Icon name="checkCircle" size={15} className="text-success" />}
                                    </span>
                                    <span className={cx('text-xs font-semibold', selected ? 'text-fg' : 'text-fg-muted')}>
                                      {translate(itemMode === 'video' ? 'tc.edu.watchVideo' : 'tc.edu.takeQuiz')}
                                    </span>
                                    <span className="text-[10px] text-fg-subtle">{meta ?? '—'}</span>
                                  </button>
                                );
                              })}
                            </div>
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
    </aside>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="grid gap-6 rounded-xl bg-surface p-6 shadow-card lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <span className="grid size-12 animate-float place-items-center rounded-xl bg-primary-soft text-primary motion-reduce:animate-none">
          <Icon name="info" size={22} />
        </span>
        <h2 className="text-xl font-semibold text-fg">{translate('tc.edu.faqTitle')}</h2>
        <p className="text-sm text-fg-muted">{translate('tc.edu.faqHint')}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={item.questionKey}
              className={cx('rounded-lg ring-1 transition-[background-color,box-shadow] duration-300', isOpen ? 'bg-primary-soft ring-primary/40' : 'bg-surface-2 ring-line')}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-fg focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex-1">{translate(item.questionKey)}</span>
                <span
                  className={cx(
                    'grid size-7 shrink-0 place-items-center rounded-full transition-[transform,background-color] duration-300',
                    isOpen ? 'rotate-180 bg-primary text-on-primary' : 'bg-surface text-fg-subtle',
                  )}
                >
                  <Icon name="chevronDown" size={14} />
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

function ModuleTabs({ activeModuleId, completed, onSelect }: { activeModuleId: number; completed: Set<string>; onSelect: (moduleId: number) => void }) {
  const moduleCount = courseModules.length;
  const activeIndex = Math.max(
    0,
    courseModules.findIndex((module) => module.id === activeModuleId),
  );
  const halfColumn = `calc(100% / ${moduleCount * 2})`;

  return (
    <nav
      aria-label={translate('tc.edu.modulesLabel')}
      style={staggerStyle(1, 150)}
      className="glow-border relative animate-rise overflow-hidden rounded-xl bg-surface p-2 shadow-card motion-reduce:animate-none"
    >
      <span
        aria-hidden="true"
        style={{ width: `calc((100% - 16px) / ${moduleCount})`, transform: `translateX(${activeIndex * 100}%)` }}
        className="absolute inset-y-2 left-2 rounded-lg bg-primary-soft ring-1 ring-primary/40 transition-transform duration-500 ease-out motion-reduce:transition-none"
      />

      <div role="tablist" style={{ gridTemplateColumns: `repeat(${moduleCount}, minmax(0, 1fr))` }} className="relative grid">
        <span aria-hidden="true" style={{ left: halfColumn, right: halfColumn }} className="absolute top-[29px] h-0.5 rounded-full bg-line" />
        <span
          aria-hidden="true"
          style={{ left: halfColumn, width: `calc(${activeIndex} * 100% / ${moduleCount})` }}
          className="absolute top-[29px] h-0.5 rounded-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none"
        />

        {courseModules.map((module, index) => {
          const isActive = index === activeIndex;
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
              className="group flex min-w-0 flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span
                className={cx(
                  'relative grid size-9 place-items-center rounded-full text-sm font-bold transition-[background-color,color,transform] duration-300 group-hover:scale-110 motion-reduce:transition-none',
                  moduleDone
                    ? 'bg-success text-white'
                    : isActive
                      ? 'bg-primary text-on-primary shadow-[0_0_22px_-4px_var(--brand-primary)]'
                      : index < activeIndex
                        ? 'bg-primary-soft text-primary ring-1 ring-primary/40'
                        : 'bg-surface-2 text-fg-subtle ring-1 ring-line',
                )}
              >
                {isActive && !moduleDone && (
                  <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-primary/40 motion-reduce:animate-none" />
                )}
                <span className="relative">{moduleDone ? <Icon name="check" size={16} /> : module.id}</span>
              </span>
              <span className={cx('max-w-full truncate text-sm font-semibold transition-colors', isActive ? 'text-fg' : 'text-fg-muted group-hover:text-fg')}>
                {module.title}
              </span>
              <span className="text-[11px] font-medium text-primary">
                {translate('tc.edu.module')} {module.id}
                {module.lessons.length > 0 && (
                  <span className="hidden text-fg-subtle sm:inline">
                    {' '}
                    · {module.lessons.length} {translate('tc.edu.lessons')}
                  </span>
                )}
              </span>
              <span aria-hidden="true" className="mt-0.5 hidden h-1 w-20 overflow-hidden rounded-full bg-surface-2 sm:block">
                <span style={{ width: `${progress}%` }} className="block h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none" />
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
      className="glow-border flex min-w-0 animate-rise flex-col items-center justify-center gap-3 rounded-xl bg-surface px-6 py-16 text-center shadow-card motion-reduce:animate-none"
    >
      <span className="grid size-16 animate-float place-items-center rounded-2xl bg-primary text-xl font-bold text-on-primary shadow-[0_0_40px_-8px_var(--brand-primary)] motion-reduce:animate-none">
        {module.id}
      </span>
      <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
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

      <ModuleTabs activeModuleId={activeModuleId} completed={completed} onSelect={selectModule} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {activeLesson ? (
          <LessonStage
            module={activeModule}
            lesson={activeLesson}
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

      <footer className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-5 text-[11px] leading-relaxed text-fg-subtle">
        {disclaimerParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </footer>
    </div>
  );
}
