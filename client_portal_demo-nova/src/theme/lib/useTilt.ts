'use client';

import { useCallback, useRef, type PointerEvent } from 'react';

/**
 * Pointer-driven 3D tilt for Orbit cards. Spread the returned props on the element and give it the
 * `orbit-tilt` utility (plus `orbit-spot` on an inner layer for the cursor light). Values are written
 * straight to CSS variables, so following the cursor never re-renders. Mouse only: touch scrolls normally.
 */
export function useTilt<T extends HTMLElement>(maxDeg = 8) {
  const ref = useRef<T>(null);

  const onPointerMove = useCallback(
    (event: PointerEvent<T>) => {
      const node = ref.current;
      if (!node || event.pointerType !== 'mouse') return;
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      node.style.setProperty('--mx', `${x * 100}%`);
      node.style.setProperty('--my', `${y * 100}%`);
      node.style.setProperty('--rx', `${(0.5 - y) * maxDeg}deg`);
      node.style.setProperty('--ry', `${(x - 0.5) * maxDeg}deg`);
    },
    [maxDeg],
  );

  const onPointerLeave = useCallback(() => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
