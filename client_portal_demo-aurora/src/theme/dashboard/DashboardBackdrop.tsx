// Deep-space depth behind the dashboard: two huge, slowly turning orbit systems (cyan and violet) with a
// satellite each, plus a few twinkling stars. Fixed and behind everything so translucent cards pick it up.
const stars = [
  { top: 12, left: 18, delay: 0 },
  { top: 26, left: 72, delay: 1200 },
  { top: 48, left: 40, delay: 2400 },
  { top: 64, left: 88, delay: 800 },
  { top: 82, left: 24, delay: 1800 },
  { top: 36, left: 94, delay: 3000 },
];

export function DashboardBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute top-[18%] -right-[26%] size-[760px] opacity-50 sm:-right-[12%]">
        <div className="orbit-ring absolute inset-0 animate-orbit-spin-rev motion-reduce:animate-none">
          <span className="absolute top-[14%] left-[14%] size-3 rounded-full bg-primary shadow-[0_0_20px_4px_var(--brand-primary)]" />
        </div>
        <div className="orbit-ring absolute inset-[16%] animate-orbit-spin motion-reduce:animate-none">
          <span className="absolute right-0 bottom-1/2 size-2 rounded-full bg-(--orbit-violet) shadow-[0_0_16px_3px_var(--orbit-violet)]" />
        </div>
        <div className="absolute inset-[34%] rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="absolute -bottom-72 -left-60 size-[640px] opacity-40">
        <div className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none">
          <span className="absolute top-1/2 right-0 size-2.5 rounded-full bg-(--orbit-violet) shadow-[0_0_18px_4px_var(--orbit-violet)]" />
        </div>
        <div className="absolute inset-[26%] rounded-full bg-(--orbit-violet)/15 blur-3xl" />
      </div>
      {stars.map((star) => (
        <span
          key={`${star.top}-${star.left}`}
          className="absolute size-[3px] animate-twinkle rounded-full bg-fg shadow-[0_0_8px_1px_var(--brand-primary)] motion-reduce:animate-none"
          style={{ top: `${star.top}%`, left: `${star.left}%`, animationDelay: `${star.delay}ms` }}
        />
      ))}
    </div>
  );
}
