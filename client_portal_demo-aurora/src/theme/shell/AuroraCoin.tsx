import { useId } from 'react';

import { cx } from '../lib/cx';

/*
 * Aurora brand coin: a glass teal disc with a real edge (stacked layers in 3D) that keeps turning and floating,
 * with a light beam behind it, a glow pooled on the "floor" and twinkling sparks around it. Decorative only.
 */
type CoinSize = 'xs' | 'sm' | 'lg';

const sizeClass: Record<CoinSize, string> = {
  xs: 'size-7',
  sm: 'size-14',
  lg: 'size-28 xl:size-32',
};

const EDGE_LAYERS = [1, 2, 3, 4, 5, 6];

const sparks = [
  { left: '-18%', top: '18%', delay: '0s', size: 'size-1' },
  { left: '108%', top: '8%', delay: '-0.8s', size: 'size-1.5' },
  { left: '-30%', top: '72%', delay: '-1.6s', size: 'size-1.5' },
  { left: '118%', top: '64%', delay: '-2.2s', size: 'size-1' },
  { left: '30%', top: '-22%', delay: '-1.1s', size: 'size-1' },
  { left: '72%', top: '112%', delay: '-2.7s', size: 'size-1' },
];

function CoinMark({ gradientId }: { gradientId: string }) {
  return (
    <svg viewBox="0 0 40 40" className="size-[54%]" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e3efe7" />
          <stop offset="55%" stopColor="#9fc4ae" />
          <stop offset="100%" stopColor="#6f9a83" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradientId})`}>
        <path d="M11 8h23l-5 6H6z" />
        <path d="M6 17h19l5 6H11z" opacity="0.85" />
        <path d="M14 26h15l-5 6H9z" opacity="0.7" />
      </g>
    </svg>
  );
}

export function AuroraCoin({ size = 'lg', className }: { size?: CoinSize; className?: string }) {
  const gradientId = `aurora-coin-${useId().replace(/:/g, '')}`;
  const isLarge = size === 'lg';

  return (
    <span aria-hidden="true" className={cx('aurora-coin-stage relative grid shrink-0 place-items-center', sizeClass[size], className)}>
      {isLarge && (
        <>
          <span className="aurora-coin-beam absolute -top-[70%] left-1/2 h-[240%] w-[70%] -translate-x-1/2 rounded-full bg-linear-to-b from-transparent via-(--aurora-ribbon-c)/30 to-transparent blur-2xl" />
          <span className="aurora-coin-floor absolute -bottom-[34%] left-1/2 h-[18%] w-[150%] -translate-x-1/2 rounded-[50%] bg-(--aurora-ribbon-c)/45 blur-lg" />
          {sparks.map((spark) => (
            <span
              key={`${spark.left}-${spark.top}`}
              style={{ left: spark.left, top: spark.top, animationDelay: spark.delay }}
              className={cx('aurora-spark absolute rounded-full bg-[#d9fff1]', spark.size)}
            />
          ))}
        </>
      )}
      <span className="aurora-coin-float relative size-full">
        <span className="aurora-coin relative block size-full">
          {EDGE_LAYERS.map((layer) => (
            <span key={layer} className="aurora-coin-edge absolute inset-0 rounded-full" style={{ transform: `translateZ(-${layer}px)` }} />
          ))}
          <span className="aurora-coin-face absolute inset-0 grid place-items-center rounded-full" style={{ transform: 'translateZ(0px)' }}>
            <span className="aurora-coin-inner grid size-[78%] place-items-center rounded-full">
              <CoinMark gradientId={gradientId} />
            </span>
          </span>
          <span className="aurora-coin-face absolute inset-0 grid place-items-center rounded-full" style={{ transform: 'translateZ(-7px) rotateY(180deg)' }}>
            <span className="aurora-coin-inner grid size-[78%] place-items-center rounded-full">
              <CoinMark gradientId={gradientId} />
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}
