import Link from "next/link";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

function getEventState(event: {
  approved: boolean;
  published: boolean;
  cancelled: boolean;
  deleted: boolean;
  sponsorRequested: boolean;
}) {
  if (event.deleted) {
    return {
      label: "Removed",
      tone: "bg-slate-200 text-slate-700",
      summary: "This event has been removed from public view."
    };
  }

  if (event.cancelled) {
    return {
      label: "Cancelled",
      tone: "bg-rose-100 text-rose-700",
      summary: "This event was cancelled after publication."
    };
  }

  if (event.published) {
    return {
      label: "Published",
      tone: "bg-emerald-100 text-emerald-700",
      summary: "Your event is live and visible on the home page."
    };
  }

  if (event.approved && event.sponsorRequested) {
    return {
      label: "Waiting To Publish",
      tone: "bg-amber-100 text-amber-700",
      summary: "Sponsorship requests were sent. Publish when sponsors are ready."
    };
  }

  if (event.approved) {
    return {
      label: "Approved",
      tone: "bg-blue-100 text-blue-700",
      summary: "Your event is approved. You can now request sponsorship or publish it."
    };
  }

  return {
    label: "Under Review",
    tone: "bg-highlight text-emerald-700",
    summary: "Your submission is with the authorities for review."
  };
}

export default async function MyEventsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const events = await prisma.event.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="page-title">My Events</h1>
        <p className="text-sm text-secondary">Track your event progress, sponsorships, and publishing in one place.</p>
      </div>

      {events.length === 0 ? (
        <p className="surface-card p-5 text-sm text-secondary">No events submitted yet.</p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const state = getEventState(event);

            return (
              <article key={event.id} className="surface-card overflow-hidden">
                <div className="grid gap-0 md:grid-cols-[1.3fr_0.9fr]">
                  <div className="p-5 md:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${state.tone}`}>
                        {state.label}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-wide text-slate-700">
                        {event.category}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-primary">{event.name}</h2>
                    <p className="mt-2 text-sm text-secondary">{state.summary}</p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Event Date</p>
                        <p className="mt-1 text-sm font-semibold text-primary">{new Date(event.date).toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Location</p>
                        <p className="mt-1 text-sm font-semibold text-primary">{event.location}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50/80 p-5 md:border-l md:border-t-0 md:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Next Step</p>
                    <p className="mt-2 text-sm text-primary">
                      {event.approved && !event.published
                        ? "Choose how you want to move this event live."
                        : event.published
                          ? "Your event is already visible to students."
                          : "Wait until the admin team finishes the review."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/my-events/${event.id}`}
                        className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        View Details
                      </Link>

                      {event.approved && !event.published ? (
                        <>
                          <Link
                            href={`/sponsorship/${event.id}`}
                            className="rounded-lg bg-highlight px-3 py-2 text-sm font-semibold text-primary transition hover:bg-emerald-100"
                          >
                            Request Sponsorship
                          </Link>
                          <form action={`/api/events/${event.id}`} method="post">
                            <input type="hidden" name="action" value="publishWithoutSponsors" />
                            <button
                              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                              type="submit"
                            >
                              Sponsors Ready & Publish
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
