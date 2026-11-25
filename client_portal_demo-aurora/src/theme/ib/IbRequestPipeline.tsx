import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { stageOrder, subIbRequestsCopy as copy, type RequestStage } from './ibSubIbRequestsData';
import { ACCENT, boardClass, captionClass, isPendingStage, percentOf, stageIcons, stageTone, stagger } from './ibSubIbRequestsKit';

/*
 * Order lifecycle: a request moves like an order — waiting on you, routed to the broker, then filled (approved)
 * or rejected (declined, a dashed branch). Left: the total with a stacked volume bar; right: one node per stage.
 */
type Counts = Record<RequestStage, number>;

function VolumeStack({ counts, total }: { counts: Counts; total: number }) {
  const filled = stageOrder.filter((stage) => counts[stage] > 0);

  return (
    <div className="flex flex-col justify-between gap-5 border-b border-line p-5 sm:p-6 lg:border-r lg:border-b-0">
      <div>
        <p className={cx(captionClass, 'text-fg-subtle')}>{copy.all}</p>
        <p key={total} className="mt-1 animate-dot-pop font-mono text-6xl leading-none font-black tracking-tighter text-fg tabular-nums motion-reduce:animate-none">
          {total}
        </p>
      </div>
      <div>
        <span aria-hidden="true" className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-fg/[0.07]">
          {filled.map((stage, index) => (
            <span key={stage} style={{ flexGrow: counts[stage], ...stagger(index, 160, 200) }} className={cx('isr-grow h-full basis-0', stageTone[stage].fill)} />
          ))}
        </span>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-fg-muted">
          {stageOrder.map((stage) => (
            <li key={stage} className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-[2px]', stageTone[stage].fill)} />
              <span className="truncate">{copy.stages[stage].label}</span>
              <span className="ml-auto font-mono font-black text-fg tabular-nums">{percentOf(counts[stage], total)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StageNode({ stage, count, total, index }: { stage: RequestStage; count: number; total: number; index: number }) {
  const text = copy.stages[stage];
  const isLive = isPendingStage(stage) && count > 0;
  const isBranch = stage === 'declined';

  return (
    <li
      style={stagger(index, 110, 150)}
      className={cx(
        'group/node flex min-w-0 animate-feed-in flex-col gap-3 border-line p-4 motion-reduce:animate-none sm:p-5',
        index % 2 === 0 && 'border-r',
        index < 2 && 'border-b xl:border-b-0',
        index < 3 && 'xl:border-r',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="relative grid size-10 shrink-0 place-items-center">
          {isLive && <span aria-hidden="true" style={{ background: ACCENT }} className="absolute inset-0 animate-ping-soft rounded-[12px] opacity-50 motion-reduce:hidden" />}
          <span
            style={isLive ? { background: ACCENT } : undefined}
            className={cx(
              'relative grid size-10 place-items-center rounded-[12px] transition-transform duration-300 group-hover/node:-translate-y-0.5 motion-reduce:transition-none',
              isLive ? 'text-white' : 'bg-fg text-app',
            )}
          >
            <Icon name={stageIcons[stage]} size={15} />
          </span>
        </span>
        <span aria-hidden="true" className={cx('relative flex-1', isBranch ? 'h-0 border-t-2 border-dashed border-line-strong' : 'h-0.5 rounded-full bg-line-strong')}>
          {!isBranch && (
            <span style={{ background: ACCENT, animationDelay: `${index * 0.7}s` }} className="isr-route absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
          )}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="min-w-0 text-sm font-bold text-fg">{text.label}</span>
        <span key={count} className="animate-dot-pop font-mono text-4xl leading-none font-black tracking-tighter text-fg tabular-nums motion-reduce:animate-none">
          {count}
        </span>
      </div>
      <span aria-hidden="true" className="relative block h-1.5 overflow-hidden rounded-full bg-fg/[0.07]">
        <span style={{ width: `${percentOf(count, total)}%`, ...stagger(index, 140, 300) }} className={cx('isr-grow absolute inset-y-0 left-0 rounded-full', stageTone[stage].fill)} />
      </span>
      <span className="text-xs text-fg-subtle">{text.hint}</span>
    </li>
  );
}

export function RequestPipeline({ counts, total }: { counts: Counts; total: number }) {
  return (
    <section aria-label={copy.title} className={cx(boardClass, 'grid animate-rise motion-reduce:animate-none lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]')}>
      <VolumeStack counts={counts} total={total} />
      <ol className="grid grid-cols-2 xl:grid-cols-4">
        {stageOrder.map((stage, index) => (
          <StageNode key={stage} stage={stage} count={counts[stage]} total={total} index={index} />
        ))}
      </ol>
    </section>
  );
}
