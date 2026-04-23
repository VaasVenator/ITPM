export default function AdminLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-slate-200" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="surface-card p-4">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-10 w-40 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="surface-card p-5">
            <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
