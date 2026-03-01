import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  if (!process.env.DATABASE_URL) {
    return (
      <section className="surface-card border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-amber-900">Database not configured</h1>
        <p className="mt-2 text-sm text-amber-800">
          Set <code>DATABASE_URL</code> in <code>.env.local</code> and restart the dev server.
        </p>
      </section>
    );
  }

  let events: Awaited<ReturnType<typeof prisma.event.findMany>> = [];
  try {
    events = await prisma.event.findMany({
      where: { approved: true, published: true },
      include: { createdBy: true, _count: { select: { votes: true } } },
      orderBy: { date: "asc" }
    });
  } catch (error) {
    const details =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? error.message
        : null;
    return (
      <section className="surface-card border-rose-200 bg-rose-50 p-6">
        <h1 className="text-lg font-semibold text-rose-900">Could not connect to database</h1>
        <p className="mt-2 text-sm text-rose-800">
          Check your <code>DATABASE_URL</code> and ensure PostgreSQL is reachable.
        </p>
        {details ? (
          <p className="mt-2 break-all text-xs text-rose-700">
            <span className="font-semibold">Debug:</span> {details}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Campus Experiences</p>
        <h1 className="page-title">Approved & Published Events</h1>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {events.map((event) => (
          <article key={event.id} className="surface-card group p-5 transition hover:-translate-y-1 hover:shadow-lg">
            <p className="inline-flex rounded-full bg-highlight px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-700">{event.category}</p>
            <h2 className="mt-3 text-xl font-semibold text-primary">{event.name}</h2>
            <p className="mt-1 text-sm text-secondary">{new Date(event.date).toLocaleString()}</p>
            <p className="text-sm text-secondary">{event.location}</p>
            <p className="mt-3 text-sm text-primary">
              Organiser: {event.createdBy.name}
              {event.createdBy.organiserBadge ? (
                <span className="ml-2 rounded-full bg-highlight px-2 py-0.5 text-xs font-semibold text-emerald-700">Organiser</span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-secondary">Votes: {event._count.votes}</p>
            <Link className="mt-4 inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition group-hover:bg-slate-800" href={`/events/${event.id}`}>
              View details
            </Link>
          </article>
        ))}
      </div>
      {events.length === 0 ? <p className="surface-card p-5 text-sm text-secondary">No published events yet.</p> : null}
    </section>
  );
}
