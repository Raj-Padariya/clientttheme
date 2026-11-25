'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

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
import { AppPromoPopup } from './AppPromoPopup';

import { AuroraCoin } from './AuroraCoin';
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

/*
 * Aurora shell: a floating smoked-glass rail of capsule rows (icons sit in round glass bubbles, the current page is a
 * lime capsule with a highlight sweeping across it) and a banner header — big page title and search pill on the left,
 * a turning 3D aurora coin in the middle, pill controls and a lime Deposit capsule on the right.
 */
const navRowClass =
  'group relative isolate flex h-11 w-full items-center gap-3 overflow-hidden rounded-full pr-3 pl-1.5 text-sm font-medium transition-[color,background-color,translate] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none';

const navRowIdleClass = 'text-sidebar-muted hover:translate-x-0.5 hover:bg-fg/[0.05] hover:text-sidebar-fg';
const navRowActiveClass = 'aurora-pill font-semibold';

function NavTile({ icon, active }: { icon: IconName; active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid size-8 shrink-0 place-items-center rounded-full transition-[background-color,color,rotate] duration-300 group-hover:-rotate-12 motion-reduce:transition-none',
        active
          ? 'bg-[#1b2622] text-[#b8d4c3] shadow-[0_6px_12px_-6px_rgb(0_0_0/0.6)]'
          : 'bg-fg/[0.06] text-sidebar-muted ring-1 ring-fg/[0.08] group-hover:bg-fg/[0.1] group-hover:text-sidebar-fg',
      )}
    >
      <Icon name={icon} size={15} />
    </span>
  );
}

function CountBadge({ value }: { value: number }) {
  return (
    <span aria-hidden="true" className="grid h-6 min-w-6 place-items-center rounded-full bg-fg/[0.06] px-1.5 font-mono text-[11px] text-sidebar-fg tabular-nums ring-1 ring-fg/[0.08]">
      {value}
    </span>
  );
}

function NavGroup({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const groupActive = isNavGroupActive(pathname, item);
  const [open, setOpen] = useState(groupActive);
  const expanded = open || groupActive;
  const panelId = `nav-${item.labelKey}`;
  const childCount = item.children?.length ?? 0;

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setOpen(!expanded)}
        className={cx(navRowClass, groupActive ? 'font-semibold text-sidebar-fg' : navRowIdleClass)}
      >
        <NavTile icon={item.icon} active={groupActive} />
        <span className="flex-1 truncate text-left">{translate(item.labelKey)}</span>
        {!expanded && <CountBadge value={childCount} />}
        <span
          aria-hidden="true"
          className={cx(
            'grid size-6 place-items-center rounded-full bg-fg/[0.04] text-sidebar-muted ring-1 ring-fg/[0.08] transition-transform duration-300 motion-reduce:transition-none',
            expanded && 'rotate-90 bg-(--sidebar-active-bg) text-sidebar-on-active ring-transparent',
          )}
        >
          <Icon name="chevronRight" size={12} />
        </span>
      </button>
      <div
        id={panelId}
        className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="overflow-hidden" inert={!expanded}>
          <ul className="relative ml-[1.45rem] flex flex-col gap-0.5 border-l border-dashed border-fg/15 py-1.5 pl-4">
            {item.children?.map((child, index) => {
              const active = isNavItemActive(pathname, child.href);
              return (
                <li key={child.href} style={expanded ? { animationDelay: `${index * 45}ms` } : undefined} className={cx('relative', expanded && 'animate-dot-pop motion-reduce:animate-none')}>
                  <span
                    aria-hidden="true"
                    className={cx(
                      'absolute top-1/2 -left-[20.5px] size-[9px] -translate-y-1/2 rounded-full',
                      active ? 'bg-(--sidebar-active-bg) ring-4 ring-(--sidebar-active-bg)/20' : 'bg-sidebar ring-1 ring-fg/20',
                    )}
                  >
                    {active && <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--sidebar-active-bg) motion-reduce:hidden" />}
                  </span>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'relative isolate flex h-9 items-center gap-2 overflow-hidden rounded-full px-3 text-[13px] transition-[color,background-color,translate] duration-200 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                      active ? 'bg-fg/[0.08] font-semibold text-sidebar-fg ring-1 ring-fg/[0.08]' : 'text-sidebar-muted hover:translate-x-0.5 hover:bg-fg/[0.04] hover:text-sidebar-fg',
                    )}
                  >
                    <span className="truncate">{translate(child.labelKey)}</span>
                    {active && <Icon name="chevronRight" size={12} className="ml-auto shrink-0 text-(--sidebar-active-bg)" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
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
    <nav aria-label={translate('nav.mainMenu')} className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => {
          const sectionLabel = item.section && (
            <li key={`section-${item.section}`} aria-hidden="true" className={cx('flex items-center gap-2 px-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.18em] text-sidebar-muted/80 uppercase', index > 0 && 'mt-4')}>
              <span className="size-1.5 rounded-full bg-(--sidebar-active-bg)" />
              {item.section}
              <span className="h-px flex-1 bg-linear-to-r from-fg/15 to-transparent" />
            </li>
          );
          if (item.children) {
            return [sectionLabel, <NavGroup key={item.labelKey} item={item} pathname={pathname} onNavigate={onNavigate} />];
          }
          const href = item.href ?? '/';
          const active = isNavItemActive(pathname, href);
          return [
            sectionLabel,
            <li key={href}>
              <Link href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={cx(navRowClass, active ? navRowActiveClass : navRowIdleClass)}>
                <NavTile icon={item.icon} active={active} />
                <span className="flex-1 truncate">{translate(item.labelKey)}</span>
                {active && <Icon name="chevronRight" size={14} className="shrink-0" />}
              </Link>
            </li>,
          ];
        })}
      </ul>
    </nav>
  );
}

// Profile footer: a glass capsule, the avatar inside a slowly turning lime → blue ring.
function SidebarProfile() {
  const { user } = useSession();
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="aurora-chip relative m-3 mt-1 flex items-center gap-3 rounded-[22px] p-2 pr-2.5">
      <span className="relative grid size-11 shrink-0 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-orbit-spin rounded-full bg-[conic-gradient(var(--aurora-ribbon-a),var(--aurora-ribbon-b),transparent_70%,var(--aurora-ribbon-a))] [animation-duration:5s] motion-reduce:animate-none" />
        <span className="relative rounded-full bg-sidebar p-[2px]">
          <Avatar name={fullName} size="md" />
        </span>
        <span aria-hidden="true" className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-sidebar" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-bold text-sidebar-fg">{fullName}</p>
        <p className="truncate text-[11px] text-sidebar-muted">{user.email}</p>
      </div>
      <Link
        href="/login"
        aria-label={translate('common.logout')}
        title={translate('common.logout')}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-fg/[0.05] text-sidebar-muted ring-1 ring-fg/[0.08] transition-colors hover:bg-danger hover:text-white hover:ring-danger focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon name="logout" size={15} />
      </Link>
    </div>
  );
}

// Aurora light inside the rail: a lime glow at the top, a blue one at the foot, both drifting, and a bright top edge.
function SidebarGlow() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span className="aurora-drift absolute -top-24 -left-20 size-64 rounded-full bg-(--aurora-ribbon-a) opacity-[0.16] blur-[70px]" />
      <span className="aurora-drift-alt absolute -right-24 -bottom-28 size-64 rounded-full bg-(--aurora-ribbon-b) opacity-[0.16] blur-[80px]" />
      <span className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/50 to-transparent" />
    </span>
  );
}

const SWIPE_CLOSE_PX = 80;

type PortalSide = 'client' | 'ib';

interface PortalSwitchProps {
  side: PortalSide;
  onChange: (side: PortalSide) => void;
}

const portalSides: { id: PortalSide; label: string; caption: string; icon: IconName }[] = [
  { id: 'client', label: 'Client', caption: 'Trading area', icon: 'user' },
  { id: 'ib', label: 'IB', caption: 'Partner area', icon: 'trendUp' },
];

/*
 * Portal picker at the head of the rail: two side-by-side cards. The active one lifts onto glass with a lime icon
 * tile and a lime rule along its foot; the other stays a quiet outline you can tap to switch.
 */
function PortalSwitch({ side, onChange }: PortalSwitchProps) {
  return (
    <div role="radiogroup" aria-label="Portal" className="mx-3 mb-3 grid shrink-0 grid-cols-2 gap-2">
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
              'group relative flex min-w-0 items-center gap-2.5 overflow-hidden rounded-2xl p-2.5 text-left transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              isActive ? 'cursor-default bg-fg/[0.08] ring-1 ring-fg/[0.12]' : 'ring-1 ring-fg/[0.06] hover:bg-fg/[0.04] hover:ring-fg/[0.12]',
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                'grid size-8 shrink-0 place-items-center rounded-xl transition-colors duration-300',
                isActive ? 'bg-(--aurora-ribbon-a) text-[#062520]' : 'bg-fg/[0.06] text-sidebar-muted group-hover:text-sidebar-fg',
              )}
            >
              <Icon name={portal.icon} size={14} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className={cx('block truncate text-[13px] font-bold', isActive ? 'text-sidebar-fg' : 'text-sidebar-muted group-hover:text-sidebar-fg')}>{portal.label}</span>
              <span className="block truncate text-[10.5px] text-sidebar-muted">{portal.caption}</span>
            </span>
            <span
              aria-hidden="true"
              className={cx(
                'absolute inset-x-3 bottom-0 h-[2px] origin-center rounded-full bg-(--aurora-ribbon-a) transition-transform duration-500 motion-reduce:transition-none',
                isActive ? 'scale-x-100' : 'scale-x-0',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function SidebarBody({ pathname, items, onNavigate, portal }: SidebarNavProps & { portal: PortalSwitchProps }) {
  return (
    <>
      <PortalSwitch {...portal} />
      <SidebarNav pathname={pathname} items={items} onNavigate={onNavigate} />
      <div className="shrink-0">
        <SidebarProfile />
      </div>
    </>
  );
}

// Compact account capsule for the top bar below lg, where the sidebar (and its profile card) is hidden.
function UserChip() {
  const { user } = useSession();
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      {/* Phones keep only the logout button here; the avatar returns from sm up. */}
      <span className="shrink-0 max-sm:hidden">
        <Avatar name={fullName} size="md" />
      </span>
      <div className="hidden min-w-0 flex-col leading-tight md:flex">
        <span className="max-w-40 truncate text-sm font-semibold text-fg">{fullName}</span>
        <span className="max-w-36 truncate text-[11px] text-fg-subtle">{user.email}</span>
      </div>
      <Link
        href="/login"
        aria-label={translate('common.logout')}
        title={translate('common.logout')}
        className={cx(iconButtonClass, 'rounded-xl hover:bg-danger/10 hover:text-danger')}
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
 * Aurora banner header: a rounded glass banner that scrolls with the page (the portal picker lives in the rail). Left — the page's group
 * chip, a big display title and the search pill; centre — the turning aurora coin on a light beam; right — the pill
 * controls and a lime Deposit capsule. Once the banner scrolls away a condensed capsule drops in at the top.
 */
const MINIBAR_AFTER_PX = 180;

function TopBar({
  pathname,
  leading,
  center,
  actions,
}: {
  pathname: string;
  leading: ReactNode;
  center: ReactNode;
  actions: ReactNode;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const title = pageTitles[pathname] ?? '';
  const pageNav = findPageNav(pathname);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > MINIBAR_AFTER_PX);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className="relative z-20 px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8 lg:pt-5">
        <div className="aurora-banner relative isolate overflow-hidden rounded-[26px] sm:rounded-[30px]">
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <span className="aurora-banner-grid absolute inset-0" />
            <span className="aurora-drift absolute -top-24 left-[38%] h-56 w-[30%] rounded-full bg-(--aurora-ribbon-c) opacity-[0.16] blur-[70px]" />
            <span className="aurora-drift-alt absolute -right-20 -bottom-24 h-56 w-[32%] rounded-full bg-(--aurora-ribbon-b) opacity-[0.14] blur-[80px]" />
            <span className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-white/45 to-transparent" />
            <span className="absolute inset-x-[30%] bottom-0 h-px bg-linear-to-r from-transparent via-(--aurora-ribbon-c)/70 to-transparent" />
          </span>

          {/* Phones and tablets: the coin floats in the top-right corner instead of the centre column. */}
          <AuroraCoin size="sm" className="absolute top-4 right-4 opacity-90 lg:hidden" />

          <div className="relative grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-8 lg:px-8 lg:py-7">
            <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2 pr-16 lg:pr-0">
                {leading}
                {pageNav?.groupKey && (
                  <span className="aurora-chip truncate rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide text-fg-muted uppercase max-sm:hidden">
                    {translate(pageNav.groupKey)}
                  </span>
                )}
              </div>
              {/* Keyed on the page so each navigation replays the entrance. */}
              <div key={pathname} className="flex min-w-0 animate-feed-in items-center gap-3 motion-reduce:animate-none">
                {pageNav && (
                  <span aria-hidden="true" className="aurora-pill grid size-10 shrink-0 place-items-center rounded-2xl max-sm:hidden">
                    <Icon name={pageNav.icon} size={18} />
                  </span>
                )}
                <h1 className="truncate font-display text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-[32px]">{title}</h1>
              </div>
              <div className="w-full max-w-[28rem]">{center}</div>
            </div>

            <div className="pointer-events-none hidden px-6 lg:block">
              <AuroraCoin />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-end lg:justify-center">
              <div className="aurora-chip flex items-center rounded-full p-1">{actions}</div>
              {!isIbPath(pathname) && (
                <Link
                  href="/deposit"
                  className="aurora-cta inline-flex h-11 items-center gap-2 rounded-full pr-2 pl-5 text-sm font-bold transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                >
                  {translate('nav.deposit')}
                  <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-[#1b2622] text-[#b8d4c3]">
                    <Icon name="deposit" size={14} />
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Condensed capsule: page title + back-to-top, dropped in once the banner has scrolled out of view. */}
      <div
        data-show={isScrolled}
        inert={!isScrolled}
        className="aurora-minibar fixed top-3 left-1/2 z-20 flex h-12 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full pr-1.5 pl-1.5 transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] data-[show=false]:pointer-events-none data-[show=false]:-translate-y-20 data-[show=false]:opacity-0 motion-reduce:transition-none lg:left-[calc(50%+var(--sidebar-width)/2)]"
      >
        {leading}
        <AuroraCoin size="xs" />
        <span className="max-w-[46vw] truncate pr-1 text-sm font-semibold text-fg">{title}</span>
        <button
          type="button"
          aria-label="Back to top"
          title="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="aurora-pill grid size-9 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Icon name="chevronRight" size={14} className="-rotate-90" />
        </button>
      </div>
    </>
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
    <div className="relative isolate min-h-dvh bg-app text-fg">
      {/* Floating glass rail, inset from the screen edges, with aurora light drifting inside it. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-width) py-5 pl-5 lg:flex">
        <div className="aurora-rail relative isolate flex min-w-0 flex-1 flex-col overflow-hidden rounded-[30px]">
          <SidebarGlow />
          <div className="flex h-20 shrink-0 items-center gap-3 px-5">
            <AuroraCoin size="xs" />
            <BrandLogo height={26} />
          </div>
          <SidebarBody pathname={pathname} items={menuItems} portal={portal} />
        </div>
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
            'aurora-rail absolute inset-y-2 left-2 isolate flex w-[min(85vw,var(--sidebar-width))] touch-pan-y flex-col overflow-hidden rounded-[28px] bg-app/90 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
            drawerOpen ? 'translate-x-0' : '-translate-x-[110%]',
          )}
        >
          <SidebarGlow />
          <div className="flex shrink-0 items-center justify-between gap-3 pt-4 pr-3 pb-4 pl-5">
            <BrandLogo height={30} />
            <span ref={drawerCloseRef} className="flex">
              <IconButton
                icon="close"
                label={translate('common.closeMenu')}
                onClick={closeDrawer}
                className="text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg"
              />
            </span>
          </div>
          <SidebarBody pathname={pathname} items={menuItems} onNavigate={closeDrawer} portal={portal} />
        </aside>
      </div>

      <div className="lg:pl-(--sidebar-width)">
        <TopBar
          center={<PageSearch />}
          pathname={pathname}
          leading={
            <IconButton
              icon="menu"
              label={translate('common.openMenu')}
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden"
            />
          }
          actions={
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              {/* Phones drop the mode toggle from the bar; Light / Dark lives in the customizer drawer. */}
              <ThemeToggle variant="switch" className="hidden sm:inline-flex" />
              <IconButton icon="palette" label={translate('customizer.open')} onClick={() => setCustomizerOpen(true)} className="rounded-full" />
              <NotificationBell />
              {/* From lg up the profile lives at the foot of the sidebar. */}
              <span className="flex border-l border-fg/10 pl-2 lg:hidden">
                <UserChip />
              </span>
            </div>
          }
        />

        <main className="mx-auto w-full max-w-(--content-max) px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {/* Customizer launcher: a squircle with a sweeping aurora rim, bottom-right on wide screens. */}
      <button
        type="button"
        onClick={() => setCustomizerOpen(true)}
        aria-label={translate('customizer.open')}
        title={translate('customizer.tab')}
        className="group fixed right-5 bottom-5 z-30 hidden size-12 overflow-hidden rounded-2xl p-px shadow-pop transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none lg:block"
      >
        <span aria-hidden="true" className="absolute -inset-4 animate-orbit-spin bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_35%,var(--orbit-violet)_60%,transparent_85%,var(--brand-primary))] [animation-duration:4s] motion-reduce:animate-none" />
        <span className="relative grid size-full place-items-center rounded-[15px] bg-surface text-primary">
          <Icon name="palette" size={18} className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none" />
        </span>
      </button>
      <ThemeCustomizerDrawer open={customizerOpen} onClose={closeCustomizer} />

      <AppPromoPopup />
      <Toaster />
    </div>
  );
}
