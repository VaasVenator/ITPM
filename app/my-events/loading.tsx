export default function MyEventsLoading() {
  return (
    <section className="space-y-6">
      <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-200" />

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="surface-card overflow-hidden">
            <div className="grid gap-0 md:grid-cols-[1.3fr_0.9fr]">
              <div className="space-y-4 p-5 md:p-6">
                <div className="flex gap-2">
                  <div className="h-7 w-24 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-7 w-24 animate-pulse rounded-full bg-slate-200" />
                </div>
                <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                </div>
              </div>
              <div className="space-y-3 border-t border-slate-200 bg-slate-50/80 p-5 md:border-l md:border-t-0 md:p-6">
                <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-200" />
                <div className="h-4 w-52 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
