// One slow gold aurora plus fine grain behind the page: enough for the glass panels to read as glass,
// quiet enough not to compete with the hero's own aurora.
export function DashboardBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden lg:left-(--sidebar-width)">
      <div className="absolute top-[30%] -right-40 size-[680px] animate-[drift_28s_ease-in-out_infinite_alternate] rounded-full bg-(--glass-blob-1) opacity-30 blur-[160px] motion-reduce:animate-none" />
      <div className="absolute -bottom-64 -left-40 size-[520px] rounded-full bg-(--glass-blob-2) opacity-20 blur-[160px]" />
      <div className="absolute inset-0 opacity-[0.035] [background-image:radial-gradient(rgb(255_255_255/0.9)_0.6px,transparent_0.6px)] [background-size:3px_3px]" />
    </div>
  );
}
