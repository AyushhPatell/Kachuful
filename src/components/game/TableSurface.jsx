export default function TableSurface({ children, className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] p-2 shadow-2xl ${className}`}
      style={{
        background: 'linear-gradient(145deg, #3d2817 0%, #2a1a0e 35%, #1f1409 70%, #2d1c10 100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,220,160,0.12)',
      }}
    >
      {/* Wood rail highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-amber-900/50 ring-inset" />
      <div className="pointer-events-none absolute inset-1 rounded-[1.75rem] ring-1 ring-amber-950/30 ring-inset" />

      {/* Felt */}
      <div
        className="relative min-h-[420px] overflow-hidden rounded-[1.65rem] sm:min-h-[480px]"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 50% 45%, rgba(255,255,255,0.06) 0%, transparent 55%),
            radial-gradient(ellipse 100% 80% at 50% 50%, #1a6b42 0%, #145a36 40%, #0f4528 100%)
          `,
          boxShadow: 'inset 0 8px 32px rgba(0,0,0,0.35), inset 0 -4px 16px rgba(0,0,0,0.2)',
        }}
      >
        {/* Felt texture noise */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Center play zone */}
        <div className="pointer-events-none absolute left-1/2 top-[42%] h-28 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/10 sm:h-32 sm:w-44" />

        {children}
      </div>
    </div>
  )
}
