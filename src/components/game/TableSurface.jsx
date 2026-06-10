export default function TableSurface({ children, className = '' }) {
  return (
    <div
      className={`relative flex h-full min-h-0 flex-col overflow-hidden ${className}`}
      style={{
        borderRadius: '2rem',
        padding: '10px',
        background: `
          radial-gradient(ellipse 80% 60% at 50% -5%, rgba(255,220,140,0.12), transparent 50%),
          linear-gradient(160deg, #5c3a18 0%, #3d2410 30%, #2a1a0c 60%, #4a2e14 100%)
        `,
        boxShadow: `
          0 32px 100px rgba(0,0,0,0.85),
          0 0 0 1px rgba(255,200,120,0.18),
          inset 0 2px 0 rgba(255,220,150,0.22),
          inset 0 -3px 10px rgba(0,0,0,0.5)
        `,
      }}
    >
      {/* Wood grain overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          borderRadius: '2rem',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='wood'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.018' numOctaves='8' seed='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23wood)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Felt surface */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          borderRadius: '1.55rem',
          background: `
            radial-gradient(ellipse 65% 50% at 50% 38%, rgba(255,255,255,0.065) 0%, transparent 55%),
            radial-gradient(ellipse 100% 85% at 50% 50%,
              #207d4e 0%,
              #186640 28%,
              #105030 55%,
              #0c3d24 80%,
              #091f14 100%
            )
          `,
          boxShadow: `
            inset 0 12px 50px rgba(0,0,0,0.45),
            inset 0 -8px 25px rgba(0,0,0,0.3),
            inset 4px 0 20px rgba(0,0,0,0.18),
            inset -4px 0 20px rgba(0,0,0,0.18)
          `,
        }}
      >
        {/* Felt noise texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.11]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Edge vignette */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.42)_100%)]" />

        {/* Overhead light bloom */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-36 opacity-25"
          style={{
            background: 'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(255,250,200,0.18), transparent)',
          }}
        />

        {/* Center play zone — decorative diamond */}
        <div
          className="pointer-events-none absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2"
          style={{ width: 144, height: 144 }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.035) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute inset-6 rotate-45 rounded-lg"
            style={{
              border: '1px solid rgba(255,255,255,0.055)',
              background: 'rgba(0,0,0,0.07)',
            }}
          />
        </div>

        {children}
      </div>
    </div>
  )
}
