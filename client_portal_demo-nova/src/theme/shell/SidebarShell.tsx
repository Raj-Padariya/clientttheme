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

/*
 * Nova shell: the sidebar is a floating panel. Every menu icon is a bead strung on one dotted thread (an abacus
 * running down the menu), the active page turns into a solid ink capsule, and submenus open as a cloud of pill
 * chips instead of a tree. The header splits into a title capsule and a control dock.
 */
const navRowClass =
  'group relative z-10 flex h-11 w-full items-center gap-3 rounded-full pr-3 pl-1.5 text-sm font-medium transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-sidebar-active motion-reduce:transition-none';

const navRowIdleClass = 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg';
const navRowActiveClass = 'bg-sidebar-fg font-semibold text-sidebar shadow-[0_14px_28px_-18px_rgb(0_0_0/0.9)]';

// Icon bead threaded on the menu's dotted line; it inverts on the active row and spins a dashed rim on hover.
function NavBead({ icon, tone }: { icon: IconName; tone: 'idle' | 'group' | 'active' }) {
  return (
    <span aria-hidden="true" className="relative grid size-8 shrink-0 place-items-center">
      {tone !== 'active' && (
        <span className="absolute -inset-0.5 rounded-full border border-dashed border-sidebar-fg/0 transition-colors duration-300 group-hover:animate-rim-spin group-hover:border-sidebar-fg/35 motion-reduce:group-hover:animate-none" />
      )}
      <span
        className={cx(
          'grid size-full place-items-center rounded-full transition-[background-color,color,transform] duration-300 group-hover:scale-105 motion-reduce:transition-none',
          tone === 'active' && 'bg-sidebar text-sidebar-fg',
          tone === 'group' && 'bg-sidebar-fg text-sidebar',
          tone === 'idle' && 'bg-sidebar text-sidebar-muted ring-1 ring-sidebar-line group-hover:text-sidebar-fg',
        )}
      >
        <Icon name={icon} size={15} />
      </span>
    </span>
  );
}

function ActivePulse() {
  return (
    <span aria-hidden="true" className="relative flex size-2 shrink-0">
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-sidebar/60 motion-reduce:hidden" />
      <span className="relative size-2 rounded-full bg-sidebar" />
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
        <NavBead icon={item.icon} tone={groupActive ? 'group' : 'idle'} />
        <span className="flex-1 truncate text-left">{translate(item.labelKey)}</span>
        <span aria-hidden="true" className={cx('font-mono text-[10px] tabular-nums transition-opacity duration-300', expanded ? 'opacity-0' : 'text-sidebar-muted opacity-70')}>
          {childCount}
        </span>
        <span
          aria-hidden="true"
          className={cx(
            'grid size-6 place-items-center rounded-full transition-[transform,background-color,color] duration-300 motion-reduce:transition-none',
            expanded ? 'rotate-45 bg-sidebar-fg text-sidebar' : 'text-sidebar-muted ring-1 ring-sidebar-line',
          )}
        >
          <Icon name="plus" size={11} />
        </span>
      </button>
      <div
        id={panelId}
        className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="overflow-hidden" inert={!expanded}>
          {/* Sub-links open as a cloud of pill chips to the right of the thread. */}
          <ul className="flex flex-wrap gap-1.5 pt-1.5 pr-1 pb-2.5 pl-12">
            {item.children?.map((child, index) => {
              const active = isNavItemActive(pathname, child.href);
              return (
                <li key={child.href} style={expanded ? { animationDelay: `${index * 45}ms` } : undefined} className={cx(expanded && 'animate-dot-pop motion-reduce:animate-none')}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-sidebar-active',
                      active ? 'bg-sidebar-fg font-semibold text-sidebar' : 'text-sidebar-muted ring-1 ring-sidebar-line hover:text-sidebar-fg hover:ring-sidebar-fg/40',
                    )}
                  >
                    {active && <span aria-hidden="true" className="size-1.5 rounded-full bg-sidebar" />}
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
      <ul className="relative flex flex-col gap-1">
        {/* The thread every icon bead hangs on. */}
        <span aria-hidden="true" className="pointer-events-none absolute top-5 bottom-5 left-[21px] border-l-2 border-dotted border-sidebar-line" />
        {items.map((item) => {
          if (item.children) {
            return <NavGroup key={item.labelKey} item={item} pathname={pathname} onNavigate={onNavigate} />;
          }
          const href = item.href ?? '/';
          const active = isNavItemActive(pathname, href);
          return (
            <li key={href}>
              <Link href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={cx(navRowClass, active ? navRowActiveClass : navRowIdleClass)}>
                <NavBead icon={item.icon} tone={active ? 'active' : 'idle'} />
                <span className="flex-1 truncate">{translate(item.labelKey)}</span>
                {active && <ActivePulse />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Profile capsule: avatar inside a slowly turning dashed rim, logout as a round bead.
function SidebarProfile() {
  const { user } = useSession();
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="m-3 mt-1 flex flex-col gap-2.5 rounded-[26px] bg-sidebar-hover/60 p-2.5 ring-1 ring-sidebar-line">
      <div className="flex items-center gap-3">
        <span className="relative grid size-12 shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-sidebar-fg/35 motion-reduce:animate-none" />
          <Avatar name={fullName} size="md" />
          <span aria-hidden="true" className="absolute right-0.5 bottom-0.5 size-2.5 rounded-full bg-success ring-2 ring-sidebar" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold text-sidebar-fg">{fullName}</p>
          <p className="truncate text-[11px] text-sidebar-muted">{user.email}</p>
        </div>
        <Link
          href="/login"
          aria-label={translate('common.logout')}
          title={translate('common.logout')}
          className="grid size-9 shrink-0 place-items-center rounded-full text-sidebar-muted ring-1 ring-sidebar-line transition-colors hover:bg-danger hover:text-white hover:ring-danger focus-visible:outline-2 focus-visible:outline-sidebar-active"
        >
          <Icon name="logout" size={15} />
        </Link>
      </div>
    </div>
  );
}

// A dot-matrix field behind the logo that fades out downwards, with a few dots blinking like an LED panel.
function SidebarDotField() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 overflow-hidden">
      <span className="absolute inset-0 bg-[radial-gradient(color-mix(in_srgb,var(--sidebar-fg)_14%,transparent)_1px,transparent_1px)] bg-[size:11px_11px] [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
      {[
        { top: 18, left: 72, delay: 0 },
        { top: 40, left: 86, delay: 0.9 },
        { top: 28, left: 58, delay: 1.7 },
        { top: 56, left: 78, delay: 2.4 },
      ].map((spot) => (
        <span
          key={`${spot.top}-${spot.left}`}
          style={{ top: `${spot.top}%`, left: `${spot.left}%`, animationDelay: `${spot.delay}s` }}
          className="absolute size-1 animate-twinkle rounded-full bg-sidebar-fg motion-reduce:hidden"
        />
      ))}
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

// Capsule switch: a solid ink puck slides under the active portal.
function PortalSwitch({ side, onChange }: PortalSwitchProps) {
  return (
    <span role="radiogroup" aria-label="Portal" className="relative grid grid-cols-2 rounded-full p-1 ring-1 ring-sidebar-line">
      <span
        aria-hidden="true"
        className={cx(
          'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-sidebar-fg transition-transform duration-500 ease-[cubic-bezier(0.3,1.3,0.5,1)] motion-reduce:transition-none',
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
              'relative z-10 flex h-9 items-center justify-center gap-2 rounded-full text-xs font-bold tracking-wide uppercase transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-sidebar-active',
              isActive ? 'cursor-default text-sidebar' : 'text-sidebar-muted hover:text-sidebar-fg',
            )}
          >
            <Icon name={portal.icon} size={13} />
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
      <div className="shrink-0 px-3 pb-4">
        <PortalSwitch {...portal} />
      </div>
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

// The page's sidebar icon as a glossy bead inside a slowly turning dashed rim.
function PageBadge({ icon }: { icon: IconName }) {
  return (
    <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center max-sm:hidden">
      <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
      <span className="nova-gloss grid size-7.5 place-items-center rounded-full text-fg">
        <Icon name={icon} size={14} />
      </span>
    </span>
  );
}

/*
 * Split header: no full-width bar. The page title floats in its own capsule on the left, the controls sit in a
 * separate dock on the right, and a dotted rail with a running bead links the two. Both capsules firm up
 * (solid fill + shadow) once the page scrolls under them.
 */
function TopBar({ pathname, portalLabel, leading, actions }: { pathname: string; portalLabel: string; leading: ReactNode; actions: ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const title = pageTitles[pathname] ?? '';
  const pageNav = findPageNav(pathname);
  const capsuleClass =
    'nova-edge-light rounded-full ring-1 ring-line backdrop-blur-xl transition-[background-color,box-shadow] duration-300 bg-surface/55 group-data-[scrolled=true]/bar:bg-surface/90 group-data-[scrolled=true]/bar:shadow-raised motion-reduce:transition-none';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header data-scrolled={isScrolled} className="group/bar sticky top-0 z-20 h-(--topbar-height) px-3 pt-3 sm:px-5 lg:px-6">
      <div className="flex h-full items-center gap-2 sm:gap-3">
        <div className={cx(capsuleClass, 'flex h-full min-w-0 items-center gap-2 py-1 pr-4 pl-1.5 sm:pr-5 lg:pl-2')}>
          {leading}
          {/* Keyed on the page so each navigation replays the entrance. */}
          <div key={pathname} className="flex min-w-0 animate-feed-in items-center gap-2.5 motion-reduce:animate-none">
            {pageNav && <PageBadge icon={pageNav.icon} />}
            <div className="min-w-0 leading-tight">
              <p className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-semibold text-fg-subtle">
                <span className="shrink-0 rounded-full bg-fg px-2 py-px text-[9.5px] font-black tracking-[0.12em] text-app uppercase">{portalLabel}</span>
                {pageNav?.groupKey && (
                  <>
                    <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-fg/30" />
                    <span className="truncate">{translate(pageNav.groupKey)}</span>
                  </>
                )}
              </p>
              <h1 className="truncate text-base font-black tracking-[-0.02em] text-fg sm:text-lg">{title}</h1>
            </div>
          </div>
        </div>

        <span aria-hidden="true" className="relative hidden h-px min-w-6 flex-1 md:block">
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-line-strong" />
          <span className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 animate-rail-run rounded-full bg-fg/70 motion-reduce:hidden" />
        </span>
        <span aria-hidden="true" className="flex-1 md:hidden" />

        <div className={cx(capsuleClass, 'flex h-full shrink-0 items-center px-1.5')}>{actions}</div>
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
      {/* Flush rail: runs edge to edge with a hairline on its right, the aurora band glowing behind the logo. */}
      {/* Floating panel: inset from the screen edges with rounded corners, instead of a flush rail. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-width) py-3 pl-3 lg:flex">
        <div className="nova-edge-light relative isolate flex min-w-0 flex-1 flex-col overflow-hidden rounded-[30px] bg-sidebar shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-sidebar-line">
          <SidebarDotField />
          <div className="flex shrink-0 items-center px-5 pt-6 pb-5">
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
            'absolute inset-y-0 left-0 isolate flex w-[min(85vw,var(--sidebar-width))] touch-pan-y flex-col overflow-hidden border-r border-sidebar-line bg-sidebar shadow-pop transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarDotField />
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
              className="lg:hidden"
            />
          }
          actions={
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <PageSearch />
              <span aria-hidden="true" className="mx-0.5 hidden size-1 rounded-full bg-fg/25 sm:block" />
              {/* Phones drop the mode toggle from the bar; Light / Dark lives in the customizer drawer. */}
              <ThemeToggle variant="switch" className="hidden sm:inline-flex" />
              <IconButton icon="palette" label={translate('customizer.open')} onClick={() => setCustomizerOpen(true)} className="rounded-full" />
              <NotificationBell />
              {/* From lg up the profile lives at the foot of the sidebar. */}
              <span className="flex border-l border-dotted border-line-strong pl-2 lg:hidden">
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
