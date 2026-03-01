import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSponsorEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { eventId, title, sponsors } = body as {
    eventId: string;
    title: string;
    sponsors: Array<{ type: "GOLD" | "SILVER" | "PARTNER"; brandName: string; email: string }>;
  };

  const event = await prisma.event.findFirst({ where: { id: eventId, createdById: user.id, approved: true } });
  if (!event) return NextResponse.json({ error: "Event not found or not approved" }, { status: 404 });

  for (const sponsor of sponsors) {
    await prisma.sponsor.create({
      data: {
        eventId,
        type: sponsor.type,
        brandName: sponsor.brandName,
        email: sponsor.email
      }
    });

    await sendSponsorEmail({
      to: sponsor.email,
      sponsorType: sponsor.type,
      eventTitle: title || event.name
    });
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { sponsorRequested: true, published: true }
  });

  return NextResponse.json({ ok: true });
}
