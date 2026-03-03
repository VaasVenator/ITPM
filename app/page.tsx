import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type HomeEvent = Awaited<ReturnType<typeof prisma.event.findMany>>[number];

function toColomboDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function EventGrid({ events }: { events: HomeEvent[] }) {
  if (events.length === 0) {
    return <p className="surface-card p-5 text-sm text-secondary">No events in this section.</p>;
  }

  return (
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
  );
}

export default async function HomePage() {
  const user = await getSessionUser();

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

  let events: HomeEvent[] = [];
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

  const todayKey = toColomboDateKey(new Date());
  const upcomingEvents = events.filter((event) => toColomboDateKey(new Date(event.date)) > todayKey);
  const happeningTodayEvents = events.filter((event) => toColomboDateKey(new Date(event.date)) === todayKey);
  const pastEvents = events.filter((event) => toColomboDateKey(new Date(event.date)) < todayKey);

  return (
    <section className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={user ? "/create-event" : "/login?redirect=/create-event"}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 p-5 text-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/20 blur-xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50">Organiser</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight">Create Event</p>
          <p className="mt-1 text-sm text-emerald-50">Plan and submit your next university event.</p>
        </Link>

        <Link
          href={user ? "/my-events" : "/login?redirect=/my-events"}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-300/20 blur-xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Dashboard</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight">My Events</p>
          <p className="mt-1 text-sm text-slate-200">Track approvals, publishing, and sponsorship status.</p>
        </Link>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Campus Experiences</p>
        <h1 className="page-title">Upcoming Events</h1>
      </div>

      <EventGrid events={upcomingEvents} />

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-primary">Happening Today</h2>
        <EventGrid events={happeningTodayEvents} />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-primary">Past Events</h2>
        <EventGrid events={pastEvents} />
      </div>
    </section>
  );
}
