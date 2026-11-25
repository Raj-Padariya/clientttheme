import { useEffect, useRef, useState } from 'react';

export interface ChartPoint {
  x: number;
  y: number;
}

/**
 * Smooth path through the points (monotone cubic, the "monotoneX" curve): bends like a spline but never
 * overshoots between two points, so a flat or zero stretch stays flat instead of dipping below it.
 */
export function smoothPath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  const [first] = points;
  if (points.length === 1) return `M${first.x},${first.y}`;

  const count = points.length;
  const gaps: number[] = [];
  const slopes: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    gaps.push(points[index + 1].x - points[index].x || 1);
    slopes.push((points[index + 1].y - points[index].y) / gaps[index]);
  }

  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === count - 1) return slopes[count - 2];
    const before = slopes[index - 1];
    const after = slopes[index];
    if (before * after <= 0) return 0;
    const gapBefore = gaps[index - 1];
    const gapAfter = gaps[index];
    return (3 * (gapBefore + gapAfter)) / ((2 * gapAfter + gapBefore) / before + (gapAfter + 2 * gapBefore) / after);
  });

  let path = `M${first.x},${first.y}`;
  for (let index = 0; index < count - 1; index += 1) {
    const third = gaps[index] / 3;
    const from = points[index];
    const to = points[index + 1];
    path += ` C${from.x + third},${from.y + tangents[index] * third} ${to.x - third},${to.y - tangents[index + 1] * third} ${to.x},${to.y}`;
  }
  return path;
}

/**
 * Tracks an element's rendered width so a chart can draw in real pixels (no stretched strokes or dots).
 * Starts from `fallback`, which is also what the server renders, so hydration always matches.
 */
export function useMeasuredWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
