export default function TableSurface({ children, className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-none p-1.5 shadow-2xl sm:rounded-2xl sm:p-2 ${className}`}
      style={{
        background: 'linear-gradient(160deg, #4a3020 0%, #2d1a0e 40%, #1a0f08 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,220,160,0.15), 0 8px 40px rgba(0,0,0,0.5)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-none ring-1 ring-amber-800/40 ring-inset sm:rounded-2xl" />

      <div
        className="relative h-full min-h-[480px] overflow-hidden rounded-none sm:rounded-[1.4rem]"
        style={{
          background: `
            radial-gradient(ellipse 85% 65% at 50% 42%, rgba(255,255,255,0.08) 0%, transparent 55%),
            radial-gradient(ellipse 100% 80% at 50% 50%, #1b7345 0%, #145a36 45%, #0a3d24 100%)
          `,
          boxShadow: 'inset 0 10px 40px rgba(0,0,0,0.4)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="pointer-events-none absolute left-1/2 top-[38%] h-28 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8 bg-black/8 sm:h-32 sm:w-48" />
        {children}
      </div>
    </div>
  )
}
