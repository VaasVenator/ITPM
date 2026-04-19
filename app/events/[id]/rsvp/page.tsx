import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { RSVPDetailForm } from "@/components/forms/rsvp-detail-form";
import { prisma } from "@/lib/prisma";

export default async function EventRsvpPage({
  params
}: {
  params: { id: string };
}) {
  const sessionUser = await getSessionUser();

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { createdBy: true }
  });

  if (!event || !event.approved || !event.published || event.deleted) {
    notFound();
  }

  return (
    <RSVPDetailForm
      eventId={event.id}
      eventName={event.name}
      eventVenue={event.location}
      eventImage={event.eventImage}
      eventDate={new Date(event.date).toLocaleDateString("en-LK", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })}
      nextStep="payment"
      currentUserName={sessionUser?.name}
      currentUserEmail={sessionUser?.email}
    />
  );
}



