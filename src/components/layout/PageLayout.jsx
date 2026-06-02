export default function PageLayout({ title, children }) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(3rem,calc(env(safe-area-inset-top)+1.5rem))] sm:px-6 sm:pt-[max(3.5rem,calc(env(safe-area-inset-top)+2rem))]">
      <header className="mb-6 text-center sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{title}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-4">{children}</main>
    </div>
  )
}
