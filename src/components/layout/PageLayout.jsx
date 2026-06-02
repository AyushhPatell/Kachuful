export default function PageLayout({ title, children }) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <header className="mb-6 text-center sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{title}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-4">{children}</main>
    </div>
  )
}
