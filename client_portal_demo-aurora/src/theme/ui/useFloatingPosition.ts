'use client';

import { useLayoutEffect, type CSSProperties, type RefObject } from 'react';

const ANCHOR_GAP_PX = 8;
const VIEWPORT_MARGIN_PX = 8;
// Starting style for the panel. React never changes it again, so the coordinates written below stay put.
const INITIAL_STYLE: CSSProperties = { position: 'fixed', top: 0, left: 0, zIndex: 60, visibility: 'hidden' };

/**
 * Places a popover rendered in a portal at fixed coordinates next to its anchor, so it is never clipped or
 * painted over by the cards around the trigger (each animated card is its own stacking context). Opens upward
 * when there is not enough room below, and follows the anchor on scroll, resize and panel size changes.
 * Coordinates are written straight to the panel's style to avoid a re-render on every scroll frame.
 */
export function useFloatingPosition(
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  { matchWidth = false }: { matchWidth?: boolean } = {},
): CSSProperties {
  useLayoutEffect(() => {
    if (!isOpen) return;

    function update() {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      if (matchWidth) panel.style.minWidth = `${anchor.width}px`;
      const spaceBelow = window.innerHeight - anchor.bottom;
      const openUp = spaceBelow < panel.offsetHeight + ANCHOR_GAP_PX + VIEWPORT_MARGIN_PX && anchor.top > spaceBelow;
      const maxLeft = window.innerWidth - panel.offsetWidth - VIEWPORT_MARGIN_PX;

      panel.style.left = `${Math.max(VIEWPORT_MARGIN_PX, Math.min(anchor.left, maxLeft))}px`;
      panel.style.top = openUp ? 'auto' : `${anchor.bottom + ANCHOR_GAP_PX}px`;
      panel.style.bottom = openUp ? `${window.innerHeight - anchor.top + ANCHOR_GAP_PX}px` : 'auto';
      panel.style.transformOrigin = openUp ? 'bottom' : 'top';
      panel.style.visibility = 'visible';
    }

    update();
    const resizeObserver = new ResizeObserver(update);
    if (panelRef.current) resizeObserver.observe(panelRef.current);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen, anchorRef, panelRef, matchWidth]);

  return INITIAL_STYLE;
}
