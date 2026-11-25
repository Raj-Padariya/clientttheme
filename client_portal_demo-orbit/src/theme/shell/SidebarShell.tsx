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
  'group relative flex h-11 w-full items-center gap-3 rounded-2xl px-1.5 text-sm font-medium transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-sidebar-active';

const navRowIdleClass = 'text-sidebar-muted hover:bg-sidebar-hover/60 hover:text-sidebar-fg';
const navRowActiveClass = 'bg-linear-to-r from-sidebar-active/20 to-sidebar-active/[0.03] font-semibold text-sidebar-fg ring-1 ring-sidebar-active/25';

// Every row carries its icon in the same rounded tile, so plain links and groups line up on one axis.
function NavIconTile({ icon, active }: { icon: IconName; active: boolean }) {
  return (
    <span
      className={cx(
        'grid size-8 shrink-0 place-items-center rounded-[10px] ring-1 transition-colors duration-200',
        active
          ? 'bg-sidebar-active/25 text-sidebar-active shadow-[0_6px_16px_-8px_var(--sidebar-active-bg)] ring-sidebar-active/45'
          : 'bg-sidebar-hover/70 ring-sidebar-line group-hover:text-sidebar-fg group-hover:ring-sidebar-active/30',
      )}
    >
      <Icon name={icon} size={16} />
    </span>
  );
}

// Pulsing beacon at the end of the active row.
function NavBeacon() {
  return (
    <span aria-hidden="true" className="relative mr-2 size-1.5 shrink-0 rounded-full bg-sidebar-active shadow-[0_0_10px_var(--sidebar-active-bg)]">
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-sidebar-active motion-reduce:hidden" />
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
        className={cx(navRowClass, groupActive ? 'text-sidebar-fg' : navRowIdleClass)}
      >
        <NavIconTile icon={item.icon} active={groupActive} />
        <span className="flex-1 truncate text-left">{translate(item.labelKey)}</span>
        <span
          aria-hidden="true"
          className={cx(
            'rounded-md px-1.5 py-0.5 font-mono text-[10px] leading-none tabular-nums',
            groupActive ? 'bg-sidebar-active/20 text-sidebar-active' : 'bg-sidebar-hover text-sidebar-muted',
          )}
        >
          {childCount}
        </span>
        <Icon
          name="chevronDown"
          size={14}
          className={cx('mr-1 text-sidebar-muted transition-transform duration-200', expanded && 'rotate-180')}
        />
      </button>
      <div
        id={panelId}
        className={cx(
          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden" inert={!expanded}>
          {/* Sub-links sit in an inset tray rather than on a tree connector. */}
          <ul className="mx-1 mt-1 mb-1.5 flex flex-col gap-0.5 rounded-xl bg-sidebar-hover/40 p-1 ring-1 ring-sidebar-line">
            {item.children?.map((child) => {
              const active = isNavItemActive(pathname, child.href);
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-[color,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-sidebar-active',
                      active
                        ? 'bg-sidebar-active/15 font-semibold text-sidebar-fg ring-1 ring-sidebar-active/30'
                        : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg',
                    )}
                  >
                    {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-sidebar-active" />}
                    <Icon name={child.icon} size={15} className={cx('shrink-0', active && 'text-sidebar-active')} />
                    <span className="truncate">{translate(child.labelKey)}</span>
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
      <p aria-hidden="true" className="px-2.5 pt-1 pb-2 text-[10px] font-bold tracking-[0.18em] text-sidebar-muted/70 uppercase">
        {translate('nav.mainMenu')}
      </p>
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
                <NavIconTile icon={item.icon} active={active} />
                <span className={cx('flex-1 truncate transition-transform duration-200 motion-reduce:transition-none', !active && 'group-hover:translate-x-0.5')}>
                  {translate(item.labelKey)}
                </span>
                {active && <NavBeacon />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SidebarProfile() {
  const { user } = useSession();
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="mx-3 mb-3 flex items-center gap-3 rounded-2xl bg-sidebar-hover/60 p-2 ring-1 ring-sidebar-line">
      <span className="shrink-0 rounded-full p-[2px] ring-1 ring-sidebar-active/50">
        <Avatar name={fullName} size="md" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-sidebar-fg">{fullName}</p>
        <p className="truncate text-[11px] text-sidebar-muted">{user.email}</p>
      </div>
      <Link
        href="/login"
        aria-label={translate('common.logout')}
        title={translate('common.logout')}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-sidebar-muted ring-1 ring-sidebar-line transition-colors hover:bg-danger/10 hover:text-danger hover:ring-danger/30 focus-visible:outline-2 focus-visible:outline-sidebar-active"
      >
        <Icon name="logout" size={16} />
      </Link>
    </div>
  );
}

// A slow dashed orbit with a single planet in the panel's top corner, plus a soft violet bloom.
function SidebarOrbitDecor() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
      <span className="absolute -top-24 -right-20 size-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--sidebar-active-bg)_22%,transparent),transparent_70%)]" />
      <span className="absolute -top-14 -right-14 size-36 animate-orbit-spin-rev rounded-full border border-dashed border-sidebar-active/25 motion-reduce:animate-none">
        <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-sidebar-active/80 shadow-[0_0_10px_var(--sidebar-active-bg)]" />
      </span>
    </span>
  );
}

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

// Full-width segmented control with a sliding glass thumb; each half names its portal.
function PortalSwitch({ side, onChange }: PortalSwitchProps) {
  return (
    <span role="radiogroup" aria-label="Portal" className="relative grid h-10 grid-cols-2 rounded-xl bg-sidebar-hover p-1 ring-1 ring-sidebar-line">
      <span
        aria-hidden="true"
        className={cx(
          'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-sidebar-active/20 shadow-[0_8px_18px_-10px_var(--sidebar-active-bg)] ring-1 ring-sidebar-active/45 transition-transform duration-500 ease-[cubic-bezier(0.3,1.3,0.5,1)] motion-reduce:transition-none',
          side === 'ib' && 'translate-x-full',
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
              'relative flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sidebar-active',
              isActive ? 'cursor-default text-sidebar-fg' : 'text-sidebar-muted hover:text-sidebar-fg',
            )}
          >
            <Icon name={portal.icon} size={14} className={cx(isActive && 'text-sidebar-active')} />
            <span>{portal.label}</span>
          </button>
        );
      })}
    </span>
  );
}

interface SidebarBodyProps extends SidebarNavProps {
  portal: PortalSwitchProps;
}

function SidebarBody({ pathname, items, portal, onNavigate }: SidebarBodyProps) {
  return (
    <>
      <div className="shrink-0 px-4 pb-4">
        <PortalSwitch {...portal} />
      </div>
      <SidebarNav pathname={pathname} items={items} onNavigate={onNavigate} />
      <div className="shrink-0 border-t border-sidebar-line pt-3">
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
    <div className="flex items-center gap-2 rounded-2xl bg-surface/70 p-1 ring-1 ring-line backdrop-blur-xl sm:gap-2.5">
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

// The page's own sidebar icon inside a small dashed orbit, with a gleam dot circling it.
function PageOrbitBadge({ icon }: { icon: IconName }) {
  return (
    <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center max-sm:hidden">
      <span className="absolute inset-0 animate-orbit-spin rounded-full border border-dashed border-primary/45 motion-reduce:animate-none" />
      <span className="absolute inset-0 animate-orbit-spin-fast motion-reduce:hidden">
        <span className="absolute -top-[3px] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-(--brand-gleam) shadow-[0_0_8px_var(--brand-gleam)] light:bg-primary light:shadow-[0_0_6px_var(--brand-primary)]" />
      </span>
      {/* Gleam is a pale lavender that vanishes on the light top bar, so light mode uses the solid brand violet. */}
      <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-(--brand-gleam) ring-1 ring-primary/35 light:bg-primary/10 light:text-primary light:ring-primary/30">
        <Icon name={icon} size={16} />
      </span>
    </span>
  );
}

/*
 * Open header: no floating box — a breadcrumb + title on the left and one command capsule on the right.
 * A frosted backdrop fades in once the page scrolls; a violet hairline always marks its lower edge.
 */
function TopBar({ pathname, portalLabel, leading, actions }: { pathname: string; portalLabel: string; leading: ReactNode; actions: ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const title = pageTitles[pathname] ?? '';
  const pageNav = findPageNav(pathname);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header data-scrolled={isScrolled} className="group/bar sticky top-0 z-20 h-(--topbar-height) px-3 sm:px-5 lg:px-7">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-app/80 opacity-0 backdrop-blur-xl transition-opacity duration-300 group-data-[scrolled=true]/bar:opacity-100 motion-reduce:transition-none"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-linear-to-r from-transparent via-primary/35 to-transparent" />

      <div className="flex h-full items-center gap-2 sm:gap-4">
        {leading}
        {/* Keyed on the page so each navigation replays the rise. */}
        <div key={pathname} className="flex min-w-0 flex-1 animate-rise items-center gap-3 motion-reduce:animate-none">
          {pageNav && <PageOrbitBadge icon={pageNav.icon} />}
          <div className="min-w-0 leading-tight">
            <p className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-fg-subtle">
              <span className="shrink-0">{portalLabel}</span>
              {pageNav?.groupKey && (
                <>
                  <Icon name="chevronRight" size={11} className="shrink-0 opacity-60" />
                  <span className="truncate text-primary">{translate(pageNav.groupKey)}</span>
                </>
              )}
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-fg sm:text-[22px]">{title}</h1>
          </div>
        </div>
        {actions}
      </div>
    </header>
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
  const portalLabel = portalSides.find((item) => item.id === portal.side)?.label ?? '';
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
      {/* Detached panel: the sidebar floats inside an inset frame instead of running edge to edge. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-width) py-3 pl-3 lg:flex">
        <div className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden rounded-[26px] bg-sidebar shadow-card ring-1 ring-sidebar-line">
          <SidebarOrbitDecor />
          <div className="flex shrink-0 items-center px-5 pt-5 pb-4">
            <BrandLogo height={30} />
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
            'absolute inset-y-0 left-0 isolate flex w-[min(85vw,var(--sidebar-width))] touch-pan-y flex-col overflow-hidden rounded-r-[26px] bg-sidebar shadow-pop transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarOrbitDecor />
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
          <SidebarBody pathname={pathname} items={menuItems} portal={portal} onNavigate={closeDrawer} />
        </aside>
      </div>

      <div className="lg:pl-(--sidebar-width)">
        <TopBar
          pathname={pathname}
          portalLabel={portalLabel}
          leading={
            <IconButton
              icon="menu"
              label={translate('common.openMenu')}
              onClick={() => setDrawerOpen(true)}
              className="-ml-1 lg:hidden"
            />
          }
          actions={
            <div className="flex shrink-0 items-center gap-2">
              {/* One command capsule: search, then the display + alert controls behind a hairline divider. */}
              <div className="flex items-center gap-1 rounded-2xl bg-surface/70 p-1 shadow-card ring-1 ring-line backdrop-blur-xl">
                <PageSearch />
                <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-line max-sm:hidden" />
                {/* Phones drop the mode toggle from the bar; Light / Dark lives in the customizer drawer. */}
                <ThemeToggle variant="switch" className="hidden sm:inline-flex" />
                <IconButton icon="palette" label={translate('customizer.open')} onClick={() => setCustomizerOpen(true)} />
                <NotificationBell />
              </div>
              {/* From lg up the profile lives at the foot of the sidebar. */}
              <span className="flex lg:hidden">
                <UserChip />
              </span>
            </div>
          }
        />

        <main className="mx-auto w-full max-w-(--content-max) px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {/* Floating customizer orb, bottom-right on wide screens; smaller screens use the bar's palette button. */}
      <button
        type="button"
        onClick={() => setCustomizerOpen(true)}
        aria-label={translate('customizer.open')}
        className="group fixed right-5 bottom-5 z-30 hidden items-center gap-2 rounded-full bg-surface/85 py-1.5 pr-4 pl-1.5 text-xs font-semibold text-fg-muted shadow-pop ring-1 ring-primary/30 backdrop-blur-xl transition-[translate,color] duration-300 hover:-translate-y-0.5 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none lg:flex"
      >
        <span className="relative grid size-8 place-items-center rounded-full bg-primary/20 text-(--brand-gleam) ring-1 ring-primary/40 light:bg-primary/10 light:text-primary">
          <span aria-hidden="true" className="absolute -inset-1 animate-orbit-spin rounded-full border border-dashed border-primary/40 motion-reduce:animate-none" />
          <Icon name="palette" size={15} className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none" />
        </span>
        <span aria-hidden="true">{translate('customizer.tab')}</span>
      </button>
      <ThemeCustomizerDrawer open={customizerOpen} onClose={closeCustomizer} />

      <AppPromoPopup />
      <Toaster />
    </div>
  );
}
