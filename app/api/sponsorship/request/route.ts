import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { sendSponsorEmail } from "@/lib/mailer";

const SPONSOR_PACKAGE_LABELS: Record<"GOLD" | "SILVER" | "PARTNER", string> = {
  GOLD: "Title Sponsor (Premium)",
  SILVER: "Associate Sponsor",
  PARTNER: "Community Partner"
};

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { eventId, sponsors } = body as {
      eventId: string;
      sponsors: Array<{ type: "GOLD" | "SILVER" | "PARTNER"; brandName: string; email: string }>;
    };

    if (!eventId || !Array.isArray(sponsors) || sponsors.length === 0) {
      return NextResponse.json({ error: "eventId and at least one sponsor are required." }, { status: 400 });
    }

    const event = await prisma.event.findFirst({ where: { id: eventId, createdById: user.id, approved: true } });
    if (!event) return NextResponse.json({ error: "Event not found or not approved" }, { status: 404 });

    await prisma.$transaction([
      prisma.sponsor.createMany({
        data: sponsors.map((sponsor) => ({
          eventId,
          type: sponsor.type,
          brandName: sponsor.brandName,
          email: sponsor.email
        }))
      }),
      prisma.event.update({
        where: { id: eventId },
        data: { sponsorRequested: true, published: false, sponsorsReady: false }
      })
    ]);

    const emailFailures: string[] = [];
    for (const sponsor of sponsors) {
      try {
        await sendSponsorEmail({
          to: sponsor.email,
          sponsorType: SPONSOR_PACKAGE_LABELS[sponsor.type] ?? sponsor.type,
          eventTitle: event.name
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown email error";
        emailFailures.push(`${sponsor.email}: ${message}`);
      }
    }

    if (emailFailures.length > 0) {
      return NextResponse.json({
        ok: true,
        warning: "Sponsorship saved, but some emails failed.",
        details: emailFailures
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sponsorship request failed:", error);
    return NextResponse.json({ error: "Failed to submit sponsorship request." }, { status: 500 });
  }
}
