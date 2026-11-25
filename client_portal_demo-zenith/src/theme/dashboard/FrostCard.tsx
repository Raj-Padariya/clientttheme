'use client';

import { useId, type PointerEvent, type ReactNode } from 'react';
import { cx } from '../lib/cx';

/** Round white control that sits on the frosted card (eye, refresh, …). */
export const frostButton =
  'grid size-10 place-items-center rounded-full bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none';

const frostHexes = [
  { className: 'top-3 right-28 w-16', delay: '0s', duration: '5s' },
  { className: 'top-20 -right-3 w-28', delay: '-1.6s', duration: '6.5s' },
  { className: '-bottom-6 left-[38%] w-24', delay: '-3.2s', duration: '5.8s' },
];

const frostDots = [
  { top: '14%', left: '46%', size: 'size-1.5', delay: '0s' },
  { top: '30%', left: '88%', size: 'size-2', delay: '0.7s' },
  { top: '58%', left: '6%', size: 'size-1.5', delay: '1.3s' },
  { top: '70%', left: '62%', size: 'size-1', delay: '0.4s' },
  { top: '8%', left: '74%', size: 'size-1', delay: '1.8s' },
];

const frostBubbles = [
  { left: '16%', size: 'size-1.5', delay: '0s', duration: '6s' },
  { left: '33%', size: 'size-1', delay: '1.8s', duration: '7s' },
  { left: '51%', size: 'size-2', delay: '3.1s', duration: '5.5s' },
  { left: '68%', size: 'size-1', delay: '0.9s', duration: '6.5s' },
  { left: '85%', size: 'size-1.5', delay: '2.4s', duration: '7.5s' },
];

/**
 * Frosted backdrop: drifting ice / blush / white hazes, floating glass hexagons, an orbit arc with a travelling
 * light, and twinkling specks.
 */
function FrostDecor() {
  const id = useId();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <span className="absolute -top-20 -left-12 size-60 animate-drift rounded-full bg-[#8fb2e0]/70 blur-3xl motion-reduce:animate-none" style={{ animationDuration: '7s' }} />
      <span
        className="absolute -right-14 -bottom-24 size-64 animate-drift rounded-full bg-[#f2c4d2]/60 blur-3xl motion-reduce:animate-none"
        style={{ animationDuration: '9s', animationDirection: 'alternate-reverse' }}
      />
      <span className="absolute top-1/3 left-1/2 size-40 animate-drift rounded-full bg-white/70 blur-3xl motion-reduce:animate-none" style={{ animationDuration: '11s' }} />

      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={`${id}-hex`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
          </linearGradient>
        </defs>
      </svg>
      {frostHexes.map((hex) => (
        <svg
          key={hex.className}
          viewBox="0 0 100 100"
          className={cx('absolute animate-float motion-reduce:animate-none', hex.className)}
          style={{ animationDelay: hex.delay, animationDuration: hex.duration }}
        >
          <polygon points="50,2 92,26 92,74 50,98 8,74 8,26" fill={`url(#${id}-hex)`} stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ))}

      <span className="absolute top-8 -right-20 size-56 rounded-full border border-white/70" />
      <span className="absolute top-8 -right-20 size-56 animate-orbit-spin motion-reduce:animate-none" style={{ animationDuration: '8s' }}>
        <span className="absolute top-1/2 -left-1 size-2 rounded-full bg-white shadow-[0_0_12px_3px_#ffffff]" />
      </span>

      {frostDots.map((dot) => (
        <span
          key={`${dot.top}-${dot.left}`}
          className={cx('absolute animate-twinkle rounded-full bg-white shadow-[0_0_8px_#ffffff] motion-reduce:animate-none', dot.size)}
          style={{ top: dot.top, left: dot.left, animationDelay: dot.delay }}
        />
      ))}

      {frostBubbles.map((bubble) => (
        <span
          key={bubble.left}
          className={cx('nova-frost-bubble absolute bottom-6 rounded-full bg-white shadow-[0_0_6px_#ffffff]', bubble.size)}
          style={{ left: bubble.left, animationDelay: bubble.delay, animationDuration: bubble.duration }}
        />
      ))}
    </div>
  );
}

// The card tilts towards the mouse and a soft light follows it; touch keeps the card flat.
function handleTilt(event: PointerEvent<HTMLDivElement>) {
  if (event.pointerType !== 'mouse') return;
  const card = event.currentTarget;
  const box = card.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width;
  const y = (event.clientY - box.top) / box.height;
  card.style.setProperty('--mx', `${x * 100}%`);
  card.style.setProperty('--my', `${y * 100}%`);
  card.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
  card.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
}

function resetTilt(event: PointerEvent<HTMLDivElement>) {
  event.currentTarget.style.setProperty('--rx', '0deg');
  event.currentTarget.style.setProperty('--ry', '0deg');
}

/**
 * Nova's frosted silver balance card: animated frost backdrop, top-edge light, sheen sweep, pointer spotlight and
 * a gentle 3D tilt. Text inside should use the dark ink colours, since the card stays light in both themes.
 */
export function FrostCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    // Rise lives on the wrapper: an animation holding `transform` would otherwise pin the tilt.
    <div className={cx('animate-rise motion-reduce:animate-none', className)}>
      <div
        onPointerMove={handleTilt}
        onPointerLeave={resetTilt}
        className="nova-frost-card nova-edge-light group/frost relative isolate h-full overflow-hidden rounded-[28px] p-5 transition-transform duration-300 ease-out motion-safe:[transform:perspective(1000px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
      >
        <FrostDecor />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/frost:opacity-100"
          style={{ background: 'radial-gradient(260px circle at var(--mx, 70%) var(--my, 0%), rgb(255 255 255 / 0.55), transparent 70%)' }}
        />
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />
        <span aria-hidden="true" className="nova-frost-border" />
        {children}
      </div>
    </div>
  );
}
