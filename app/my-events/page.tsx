import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MyEventsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const events = await prisma.event.findMany({ where: { createdById: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <section className="space-y-5">
      <h1 className="page-title">My Events</h1>
      {events.map((event) => (
        <div key={event.id} className="surface-card p-5">
          <p className="text-lg font-semibold text-primary">{event.name}</p>
          <p className="mt-1 text-sm text-secondary">Approved: {String(event.approved)} | Published: {String(event.published)}</p>
          {event.approved && !event.published ? (
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href={`/sponsorship/${event.id}`} className="rounded-lg bg-highlight px-3 py-2 font-semibold text-primary transition hover:bg-emerald-100">
                Request sponsorship
              </Link>
              <form action={`/api/events/${event.id}`} method="post">
                <input type="hidden" name="action" value="publishWithoutSponsors" />
                <button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800" type="submit">Sponsors Ready & Publish</button>
              </form>
            </div>
          ) : null}
        </div>
      ))}
      {events.length === 0 ? <p className="surface-card p-5 text-sm text-secondary">No events submitted yet.</p> : null}
    </section>
  );
}
