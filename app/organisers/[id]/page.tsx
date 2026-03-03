import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function OrganiserProfilePage({ params }: { params: { id: string } }) {
  const organiser = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      username: true,
      profileImage: true,
      organiserBadge: true,
      createdAt: true,
      _count: { select: { eventsCreated: true } }
    }
  });

  if (!organiser) notFound();

  const [publishedEvents, organiserVotes, rsvpVotes] = await Promise.all([
    prisma.event.findMany({
      where: { createdById: organiser.id, approved: true, published: true, deleted: false },
      select: {
        id: true,
        name: true,
        category: true,
        date: true,
        location: true,
        cancelled: true,
        eventImage: true
      },
      orderBy: { date: "asc" },
      take: 12
    }),
    prisma.vote.count({
      where: {
        voteType: "ORGANISER_VOTE",
        event: { createdById: organiser.id, deleted: false }
      }
    }),
    prisma.vote.count({
      where: {
        voteType: "RSVP",
        event: { createdById: organiser.id, deleted: false }
      }
    })
  ]);

  return (
    <section className="space-y-6">
      <div className="surface-card overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {organiser.profileImage ? (
              <img src={organiser.profileImage} alt={`${organiser.name} profile`} className="h-20 w-20 rounded-2xl border border-slate-200 object-cover" />
            ) : (
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-200 to-emerald-500 text-2xl font-black text-white">
                {organiser.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Organiser Profile</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-primary">{organiser.name}</h1>
              <p className="mt-1 text-sm text-secondary">@{organiser.username}</p>
              {organiser.organiserBadge ? (
                <span className="mt-2 inline-flex rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-emerald-700">
                  Verified Organiser
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-sm text-secondary">Joined on {new Date(organiser.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Events Created</p>
          <p className="mt-2 text-3xl font-black text-primary">{organiser._count.eventsCreated}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Organiser Votes</p>
          <p className="mt-2 text-3xl font-black text-primary">{organiserVotes}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">RSVP Votes</p>
          <p className="mt-2 text-3xl font-black text-primary">{rsvpVotes}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight text-primary">Published Events</h2>
        {publishedEvents.length === 0 ? (
          <p className="surface-card p-5 text-sm text-secondary">No published events yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {publishedEvents.map((event) => (
              <article key={event.id} className="surface-card p-4">
                {event.eventImage ? (
                  <img src={event.eventImage} alt={`${event.name} poster`} className="mb-3 h-40 w-full rounded-xl object-cover" />
                ) : (
                  <div className="mb-3 h-40 w-full rounded-xl bg-slate-100" />
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-highlight px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-700">{event.category}</span>
                  {event.cancelled ? (
                    <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-rose-700">
                      Cancelled
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-primary">{event.name}</h3>
                <p className="mt-1 text-sm text-secondary">{new Date(event.date).toLocaleString()}</p>
                <p className="text-sm text-secondary">{event.location}</p>
                <Link href={`/events/${event.id}`} className="mt-3 inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                  View Event
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
