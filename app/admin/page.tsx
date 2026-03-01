import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return <p className="surface-card p-5 text-sm text-secondary">Admin access only.</p>;
  }

  const [events, tickets] = await Promise.all([
    prisma.event.findMany({ where: { approved: false }, include: { createdBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.ticket.findMany({ where: { approved: false }, include: { event: true, user: true }, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <section className="space-y-8">
      <h1 className="page-title">Admin Dashboard</h1>

      <div>
        <h2 className="mb-3 text-xl font-semibold text-primary">Pending Event Approvals</h2>
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="surface-card p-4 text-sm">
              <p className="font-semibold text-primary">{event.name} by {event.createdBy.name}</p>
              <div className="mt-3 flex gap-3">
                <form action={`/api/admin/events/${event.id}/approve`} method="post"><button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-brand-dark">Approve</button></form>
                <form action={`/api/admin/events/${event.id}/reject`} method="post"><button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800">Reject</button></form>
              </div>
            </div>
          ))}
          {events.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No pending events.</p> : null}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xl font-semibold text-primary">Pending Ticket Slips</h2>
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="surface-card p-4 text-sm">
              <p className="font-semibold text-primary">{ticket.user.name} • {ticket.event.name}</p>
              <p className="mt-1 break-all text-secondary">Slip: {ticket.paymentSlip}</p>
              <div className="mt-3 flex gap-3">
                <form action={`/api/admin/tickets/${ticket.id}/approve`} method="post"><button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-brand-dark">Approve</button></form>
                <form action={`/api/admin/tickets/${ticket.id}/reject`} method="post"><button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800">Reject</button></form>
              </div>
            </div>
          ))}
          {tickets.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No pending ticket approvals.</p> : null}
        </div>
      </div>
    </section>
  );
}
