'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

import { translate, type MessageKey } from '@/core/i18n';
import { useSession } from '@/core/session/useSession';
import { cx } from '../lib/cx';
import { pageTitles } from '../meta';
import { Avatar } from '../ui/Avatar';
import { BrandLogo } from '../ui/BrandLogo';
import { IconButton, iconButtonClass } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Toaster } from '../ui/Toast';
import { NotificationBell } from './NotificationBell';
import { ThemeCustomizerDrawer } from './ThemeCustomizerDrawer';
import { PageSearch } from './PageSearch';
import {
  CLIENT_HOME,
  IB_HOME,
  ibNavItems,
  isIbPath,
  isNavGroupActive,
  isNavItemActive,
  navItems,
  type NavItem,
} from './navItems';

const navRowClass =
  'group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-sidebar-active';

const navRowIdleClass = 'isolate text-sidebar-muted hover:nav-hover hover:text-sidebar-fg focus-visible:nav-hover';
// Light mode paints the active row as a graphite pill (see --nav-active-* in tokens.css), so its label turns white there.
const navRowActiveClass = 'nav-active isolate overflow-hidden font-semibold text-sidebar-fg light:text-white';

const sparkles = [
  { position: 'right-[14%] top-[24%]', delay: '0s' },
  { position: 'right-[31%] bottom-[22%]', delay: '0.9s' },
  { position: 'right-[7%] bottom-[30%]', delay: '1.7s' },
];

// Decorative layers behind the active row's content: a slowly drifting gold glow and a few twinkling specks.
function NavActiveDecor() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <span className="nav-active-orb absolute -right-8 -bottom-10 size-28 animate-nav-glow rounded-full motion-reduce:animate-none" />
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.delay}
          className={cx('absolute size-[3px] animate-twinkle rounded-full bg-white/80 motion-reduce:animate-none', sparkle.position)}
          style={{ animationDelay: sparkle.delay }}
        />
      ))}
    </span>
  );
}

// A soft light sweep across an idle row while it is hovered.
function NavHoverSheen() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl motion-reduce:hidden">
      <span className="absolute inset-y-0 left-0 w-1/3 -translate-x-full -skew-x-12 bg-linear-to-r from-transparent via-white/10 to-transparent opacity-0 transition-[translate,opacity] duration-700 ease-out group-hover:translate-x-[400%] group-hover:opacity-100" />
    </span>
  );
}

function NavGroup({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const groupActive = isNavGroupActive(pathname, item);
  const [open, setOpen] = useState(groupActive);
  const expanded = open || groupActive;
  const panelId = `nav-${item.labelKey}`;

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setOpen(!expanded)}
        className={cx(navRowClass, groupActive ? 'text-sidebar-fg' : navRowIdleClass)}
      >
        {!groupActive && <NavHoverSheen />}
        {/* Round badge like the reference; the negative margin keeps the label aligned with the plain 19px icons above and below. */}
        <span
          className={cx(
            '-mx-[6.5px] flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-hover ring-1 transition-colors',
            groupActive ? 'text-sidebar-active ring-sidebar-active/40' : 'ring-sidebar-line group-hover:ring-sidebar-muted/40',
          )}
        >
          <Icon name={item.icon} size={17} />
        </span>
        <span className="flex-1 truncate text-left">{translate(item.labelKey)}</span>
        <Icon
          name="chevronDown"
          size={16}
          className={cx('text-sidebar-muted transition-transform duration-200', expanded && 'rotate-180')}
        />
      </button>
      <div
        id={panelId}
        className={cx(
          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <ul className="ml-[21px] flex flex-col overflow-hidden pb-1" inert={!expanded}>
          {item.children?.map((child, index) => {
            const active = isNavItemActive(pathname, child.href);
            const isLast = index === (item.children?.length ?? 0) - 1;
            const connectorTone = active ? 'bg-sidebar-active/70' : 'bg-sidebar-muted/35';
            return (
              <li key={child.href} className="relative py-0.5 pl-6">
                {/* Tree connector: a trunk with a branch per item; the last item gets a rounded elbow instead. */}
                {isLast ? (
                  <span
                    aria-hidden="true"
                    className={cx(
                      'absolute top-0 left-0 h-1/2 w-5 rounded-bl-[10px] border-b border-l',
                      active ? 'border-sidebar-active/70' : 'border-sidebar-muted/35',
                    )}
                  />
                ) : (
                  <>
                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-sidebar-muted/35" />
                    <span aria-hidden="true" className={cx('absolute top-1/2 left-0 h-px w-5', connectorTone)} />
                  </>
                )}
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-sidebar-active',
                    active ? navRowActiveClass : navRowIdleClass,
                  )}
                >
                  {active && <NavActiveDecor />}
                  <Icon name={child.icon} size={16} className={cx('shrink-0', active && 'text-sidebar-active')} />
                  <span className="truncate">{translate(child.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}

interface SidebarNavProps {
  pathname: string;
  items: NavItem[];
  onNavigate?: () => void;
}

function SidebarNav({ pathname, items, onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label={translate('nav.mainMenu')} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          if (item.children) {
            return <NavGroup key={item.labelKey} item={item} pathname={pathname} onNavigate={onNavigate} />;
          }
          const href = item.href ?? '/';
          const active = isNavItemActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cx(navRowClass, active ? navRowActiveClass : navRowIdleClass)}
              >
                {active ? <NavActiveDecor /> : <NavHoverSheen />}
                <Icon name={item.icon} size={19} className={cx(active && 'text-sidebar-active')} />
                <span className={cx('truncate transition-transform duration-200 motion-reduce:transition-none', !active && 'group-hover:translate-x-0.5')}>
                  {translate(item.labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Decorative chart drawn on the mini phone's screen (viewBox 0 0 40 24).
const PROMO_SPARK_POINTS = '0,19 6,16 11,17 16,11 21,13 27,7 32,9 40,3';
const PROMO_BAR_HEIGHTS = [40, 65, 50, 85, 70];

function AppPromoCard() {
  // The sidebar can render twice (desktop + mobile drawer); a hidden copy's gradient id would break the visible one.
  const sparkFillId = useId();
  return (
    <div className="group relative mx-4 mb-4 rounded-2xl bg-linear-to-br from-sidebar-active/60 via-sidebar-line to-sidebar-line p-px">
      <div className="relative isolate overflow-hidden rounded-[15px] bg-sidebar-hover p-4">
        <span aria-hidden="true" className="pointer-events-none absolute -top-14 -right-12 -z-10 size-40 animate-drift rounded-full bg-sidebar-active/25 blur-2xl motion-reduce:animate-none" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background-image:radial-gradient(var(--sidebar-border)_1px,transparent_1px)] [background-size:10px_10px] [mask-image:linear-gradient(to_bottom_left,black,transparent_70%)]"
        />

        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-sm leading-tight font-semibold text-sidebar-fg">{translate('nav.appTitle')}</p>
            <p className="mt-1.5 text-xs leading-snug text-sidebar-muted">{translate('nav.appText')}</p>
          </div>

          {/* Tilted mini phone with a live-looking chart; floats and straightens on hover. */}
          <div aria-hidden="true" className="-mt-1 -mr-1 shrink-0 animate-float motion-reduce:animate-none">
            <div className="relative h-[92px] w-[52px] rotate-[8deg] rounded-[14px] border border-sidebar-active/50 bg-sidebar p-1 shadow-[0_14px_28px_-12px_var(--sidebar-active-bg)] transition-transform duration-500 group-hover:rotate-0 motion-reduce:transition-none">
              <span className="absolute top-1.5 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full bg-sidebar-line" />
              <div className="flex h-full flex-col justify-end gap-1.5 overflow-hidden rounded-[10px] bg-linear-to-b from-sidebar-hover to-sidebar px-1 pb-1.5">
                <svg viewBox="0 0 40 24" className="w-full overflow-visible">
                  <defs>
                    <linearGradient id={sparkFillId} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--sidebar-active-bg)" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="var(--sidebar-active-bg)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={`${PROMO_SPARK_POINTS} 40,24 0,24`} fill={`url(#${sparkFillId})`} />
                  <polyline points={PROMO_SPARK_POINTS} fill="none" stroke="var(--sidebar-active-bg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="40" cy="3" r="2" fill="var(--sidebar-active-bg)" />
                  <circle cx="40" cy="3" r="2" fill="var(--sidebar-active-bg)" className="origin-[40px_3px] animate-ping-soft motion-reduce:hidden" />
                </svg>
                <div className="flex h-3 items-end gap-0.5">
                  {PROMO_BAR_HEIGHTS.map((height, index) => (
                    <span
                      key={index}
                      style={{ height: `${height}%`, animationDelay: `${300 + index * 90}ms` }}
                      className="flex-1 origin-bottom animate-grow rounded-[1px] bg-sidebar-active/60 motion-reduce:animate-none"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/platforms"
          className="relative mt-4 flex h-9 items-center justify-center gap-2 overflow-hidden rounded-lg bg-sidebar-active text-xs font-semibold text-sidebar-on-active shadow-[0_10px_22px_-12px_var(--sidebar-active-bg)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-active motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <Icon name="smartphone" size={14} className="relative" />
          <span className="relative">{translate('nav.appInstall')}</span>
          <Icon name="arrowRight" size={14} className="relative transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

// How far a left swipe must travel before the mobile menu closes instead of snapping back.
const SWIPE_CLOSE_PX = 80;

type PortalSide = 'client' | 'ib';

interface PortalSwitchProps {
  side: PortalSide;
  onChange: (side: PortalSide) => void;
}

const portalSides: { id: PortalSide; label: string; icon: IconName }[] = [
  { id: 'client', label: 'Client', icon: 'user' },
  { id: 'ib', label: 'IB', icon: 'trendUp' },
];

function SidebarBody({ pathname, items, onNavigate }: SidebarNavProps) {
  return (
    <>
      <SidebarNav pathname={pathname} items={items} onNavigate={onNavigate} />
      <AppPromoCard />
    </>
  );
}

/*
 * Client / IB portal switch beside the sidebar logo: a two-position pill with both sides always visible and a
 * gold thumb on the current one, so it reads as a toggle at a glance. Picking the other side opens that portal's
 * dashboard; AppShell derives the side from the URL. The caption under it repeats both names, current one lit.
 */
function PortalSwitch({ side, onChange }: PortalSwitchProps) {
  const isIb = side === 'ib';

  return (
    <span className="flex w-[78px] shrink-0 flex-col gap-1.5">
      <span role="radiogroup" aria-label="Portal" className="relative grid h-9 w-full grid-cols-2 rounded-full bg-sidebar-hover p-1 ring-1 ring-sidebar-line">
        <span
          aria-hidden="true"
          className={cx(
            'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full shadow-[0_6px_14px_-6px_var(--brand-primary)] transition-transform duration-500 ease-[cubic-bezier(0.3,1.3,0.5,1)] [background:radial-gradient(circle_at_30%_25%,var(--brand-gleam),var(--brand-accent)_80%)] motion-reduce:transition-none',
            isIb && 'translate-x-full',
          )}
        />
        {portalSides.map((portal) => {
          const isActive = portal.id === side;
          return (
            <button
              key={portal.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`${portal.label} portal`}
              title={isActive ? `${portal.label} portal` : `Switch to ${portal.label}`}
              onClick={() => {
                if (!isActive) onChange(portal.id);
              }}
              className={cx(
                'relative grid place-items-center rounded-full leading-none transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sidebar-active',
                isActive ? 'cursor-default text-[#18181b]' : 'text-sidebar-muted hover:text-sidebar-fg',
              )}
            >
              {portal.id === 'ib' ? <span className="text-[11px] font-extrabold">IB</span> : <Icon name="user" size={14} strokeWidth={2.2} />}
            </button>
          );
        })}
      </span>
      {/* Same two columns as the pill (incl. its p-1), so each name sits right under its own half. */}
      <span aria-hidden="true" className="grid grid-cols-2 px-1 text-center text-[8.5px] leading-none font-bold tracking-[0.1em] uppercase">
        {portalSides.map((portal) => (
          // Letter-spacing trails the last letter, so the matching left padding keeps each word optically centred.
          <span key={portal.id} className={cx('pl-[0.1em] transition-colors', portal.id === side ? 'text-primary' : 'text-sidebar-muted')}>
            {portal.label}
          </span>
        ))}
      </span>
    </span>
  );
}


function UserChip() {
  const { user } = useSession();
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-surface-2/60 p-1 sm:gap-3 sm:p-1.5">
      {/* Phones keep only the logout button here; the avatar returns from sm up. */}
      <span className="shrink-0 rounded-full p-[2px] ring-1 ring-primary/50 max-sm:hidden">
        <Avatar name={fullName} size="md" />
      </span>
      {/* Name + email only where the rail has room: tablets, and wide desktops beside the sidebar. */}
      <div className="hidden min-w-0 flex-col leading-tight md:flex lg:hidden xl:flex">
        <span className="max-w-44 truncate text-[15px] font-semibold text-fg">{fullName}</span>
        <span className="max-w-40 truncate text-xs text-fg-subtle">{user.email}</span>
      </div>
      <Link
        href="/login"
        aria-label={translate('common.logout')}
        title={translate('common.logout')}
        className={cx(
          iconButtonClass,
          'rounded-full border border-line bg-surface hover:border-danger/40 hover:text-danger [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:translate-x-0.5 motion-reduce:[&_svg]:transition-none',
        )}
      >
        <Icon name="logout" size={18} />
      </Link>
    </div>
  );
}

// The sidebar entry for a page: its icon, plus the group label when the page sits in a submenu.
function findPageNav(pathname: string): { icon: IconName; groupKey?: MessageKey } | undefined {
  for (const item of [...navItems, ...ibNavItems]) {
    if (item.href && isNavItemActive(pathname, item.href)) return { icon: item.icon };
    const child = item.children?.find((link) => isNavItemActive(pathname, link.href));
    if (child) return { icon: child.icon, groupKey: item.labelKey };
  }
  return undefined;
}

/*
 * Floating command rail: a gold comet circles its edge, a soft light follows the pointer,
 * and it tightens with a stronger shadow once the page scrolls.
 */
function TopRail({ pathname, leading, actions }: { pathname: string; leading: ReactNode; actions: ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const title = pageTitles[pathname] ?? '';
  const pageNav = findPageNav(pathname);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rail = event.currentTarget;
    rail.style.setProperty('--spot-x', `${event.clientX - rail.getBoundingClientRect().left}px`);
  }

  return (
    <div
      data-scrolled={isScrolled}
      onPointerMove={handlePointerMove}
      className="group/rail glow-border flex h-[calc(var(--topbar-height)-1rem)] min-w-0 flex-1 items-center gap-2 rounded-[22px] bg-surface/85 pr-2 pl-2 shadow-card backdrop-blur-xl transition-[height,box-shadow,background-color] duration-300 data-[scrolled=true]:h-[calc(var(--topbar-height)-1.5rem)] data-[scrolled=true]:bg-surface/95 data-[scrolled=true]:shadow-pop sm:gap-4 sm:pr-2.5 sm:pl-5 motion-reduce:transition-none"
    >
      <span aria-hidden="true" className="topbar-rim pointer-events-none absolute inset-0 rounded-[inherit] animate-rim-spin [animation-duration:11s] motion-reduce:hidden" />
      <span aria-hidden="true" className="topbar-spot pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/rail:opacity-100" />

      {leading}
      {/* Keyed on the page so each navigation replays the rise. */}
      <div key={pathname} className="flex min-w-0 flex-1 animate-rise items-center gap-3.5 motion-reduce:animate-none">
        {pageNav && (
          // Graphite diamond holding the page's own sidebar icon in gold; the icon is turned back upright.
          <span
            aria-hidden="true"
            className="mx-1.5 grid size-10 shrink-0 rotate-45 place-items-center rounded-xl bg-[#18181b] text-(--brand-gleam) shadow-[0_12px_24px_-12px_var(--brand-primary)] ring-1 ring-primary/45 transition-transform duration-500 group-hover/rail:rotate-[135deg] max-sm:hidden motion-reduce:transition-none"
          >
            <span className="-rotate-45 transition-transform duration-500 group-hover/rail:-rotate-[135deg] motion-reduce:transition-none">
              <Icon name={pageNav.icon} size={19} />
            </span>
          </span>
        )}
        <div className="min-w-0 leading-tight">
          {pageNav?.groupKey && (
            <p className="truncate text-[10px] font-semibold tracking-[0.16em] text-primary uppercase sm:text-[11px] sm:tracking-[0.2em]">{translate(pageNav.groupKey)}</p>
          )}
          <h1 className="truncate text-lg font-semibold tracking-tight text-fg sm:text-2xl xl:text-[26px]">{title}</h1>
        </div>
      </div>
      {actions}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  // The portal is decided by the URL: everything under /ib is the IB portal, the rest is the client portal.
  const isIb = isIbPath(pathname);
  const menuItems = isIb ? ibNavItems : navItems;
  const portal: PortalSwitchProps = {
    side: isIb ? 'ib' : 'client',
    onChange: (side) => router.push(side === 'ib' ? IB_HOME : CLIENT_HOME),
  };
  const closeDrawer = () => setDrawerOpen(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  // Stable so the drawer's Escape / focus effect doesn't re-run (and steal focus) on every shell render.
  const closeCustomizer = useCallback(() => setCustomizerOpen(false), []);

  const drawerCloseRef = useRef<HTMLSpanElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const [swipeX, setSwipeX] = useState(0);

  // The panel is always mounted now, so autoFocus no longer fires; move focus to its close button on each open.
  useEffect(() => {
    if (drawerOpen) drawerCloseRef.current?.querySelector('button')?.focus();
  }, [drawerOpen]);

  function handleDrawerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') closeDrawer();
  }

  function handleSwipeStart(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse') return;
    swipeStartX.current = event.clientX;
  }

  function handleSwipeMove(event: PointerEvent<HTMLElement>) {
    if (swipeStartX.current === null) return;
    // Only leftward drags move the panel; it never pulls past its open position.
    setSwipeX(Math.min(0, event.clientX - swipeStartX.current));
  }

  function resetSwipe() {
    swipeStartX.current = null;
    setSwipeX(0);
  }

  function handleSwipeEnd() {
    if (swipeX < -SWIPE_CLOSE_PX) closeDrawer();
    resetSwipe();
  }

  return (
    <div className="min-h-dvh bg-app text-fg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-width) flex-col border-r border-sidebar-line bg-sidebar lg:flex">
        <div className="flex h-(--topbar-height) shrink-0 items-center justify-between gap-3 px-6">
          <BrandLogo height={32} />
          <PortalSwitch {...portal} />
        </div>
        <SidebarBody pathname={pathname} items={menuItems} />
      </aside>

      {/*
        Mobile menu stays mounted so it can slide in from the left and back out; `inert` keeps it out of the tab
        order and away from screen readers while it is parked off-screen. A left swipe on the panel also closes it.
      */}
      <div
        className={cx('fixed inset-0 z-40 lg:hidden', !drawerOpen && 'pointer-events-none')}
        role="dialog"
        aria-modal="true"
        aria-label={translate('common.openMenu')}
        inert={!drawerOpen}
        onKeyDown={handleDrawerKeyDown}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={translate('common.closeMenu')}
          className={cx(
            'absolute inset-0 bg-overlay backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={closeDrawer}
        />
        <aside
          onPointerDown={handleSwipeStart}
          onPointerMove={handleSwipeMove}
          onPointerUp={handleSwipeEnd}
          onPointerCancel={resetSwipe}
          style={swipeX ? { transform: `translateX(${swipeX}px)`, transition: 'none' } : undefined}
          className={cx(
            'absolute inset-y-0 left-0 flex w-[min(85vw,var(--sidebar-width))] touch-pan-y flex-col bg-sidebar shadow-pop transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-(--topbar-height) shrink-0 items-center justify-between pr-3 pl-6">
            <BrandLogo height={30} />
            <span className="mr-1 ml-auto flex">
              <PortalSwitch {...portal} />
            </span>
            <span ref={drawerCloseRef} className="flex">
              <IconButton
                icon="close"
                label={translate('common.closeMenu')}
                onClick={closeDrawer}
                className="text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg"
              />
            </span>
          </div>
          <SidebarBody pathname={pathname} items={menuItems} onNavigate={closeDrawer} />
        </aside>
      </div>

      <div className="lg:pl-(--sidebar-width)">
        {/* Floating rail: the outer strip keeps --topbar-height so the bar lines up with the sidebar logo row. */}
        <header className="sticky top-0 z-20 flex h-(--topbar-height) items-center px-3 sm:px-5 lg:px-7">
          <TopRail
            pathname={pathname}
            leading={
              <IconButton
                icon="menu"
                label={translate('common.openMenu')}
                onClick={() => setDrawerOpen(true)}
                className="-ml-1 lg:hidden"
              />
            }
            actions={
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <PageSearch />
              <div className="flex items-center gap-1 rounded-full border border-line bg-surface-2/60 p-1 sm:gap-1.5 sm:p-1.5">
                {/* Phones drop the mode toggle from the rail; Light / Dark lives in the customizer drawer. */}
                <ThemeToggle variant="switch" className="hidden sm:inline-flex" />
                <IconButton icon="palette" label={translate('customizer.open')} onClick={() => setCustomizerOpen(true)} />
                <NotificationBell />
              </div>
              <UserChip />
            </div>
            }
          />
        </header>

        <main className="mx-auto w-full max-w-(--content-max) px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {/*
        Edge tab for the customizer; on small screens the top-bar palette button is enough. Graphite in both
        modes so the label stays readable whatever palette is picked; only the icon disc and edge strip take the brand colour.
      */}
      <button
        type="button"
        onClick={() => setCustomizerOpen(true)}
        aria-label={translate('customizer.open')}
        className="group fixed top-1/2 right-0 z-30 hidden -translate-y-1/2 translate-x-1.5 flex-col items-center gap-3 overflow-hidden rounded-l-2xl bg-[#18181b] py-3 pr-3.5 pl-2 shadow-[var(--elev-2)] ring-1 ring-white/10 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:translate-x-0 focus-visible:translate-x-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none lg:flex"
      >
        <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full [background-image:linear-gradient(180deg,var(--brand-gleam),var(--brand-accent))]" />
        <span className="grid size-8 place-items-center rounded-full text-[#18181b] shadow-[0_6px_16px_-8px_var(--brand-primary)] [background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]">
          <Icon name="palette" size={15} className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none" />
        </span>
        <span aria-hidden="true" className="rotate-180 text-[10px] font-bold tracking-[0.18em] text-white/75 uppercase transition-colors [writing-mode:vertical-rl] group-hover:text-white">
          {translate('customizer.tab')}
        </span>
      </button>
      <ThemeCustomizerDrawer open={customizerOpen} onClose={closeCustomizer} />

      <Toaster />
    </div>
  );
}
