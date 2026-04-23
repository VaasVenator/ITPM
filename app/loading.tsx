export default function AppLoading() {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
      </div>

      <div className="h-10 w-56 animate-pulse rounded-xl bg-slate-200" />

      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card p-5">
            <div className="mb-3 h-44 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-4 w-56 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-10 w-28 animate-pulse rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>
    </section>
  );
}
