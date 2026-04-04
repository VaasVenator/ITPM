import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/server-auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", `/events/${params.id}`);
    return NextResponse.redirect(loginUrl);
  }

  const review = await prisma.eventReview.findUnique({
    where: {
      eventId_userId: {
        eventId: params.id,
        userId: user.id
      }
    }
  });

  if (!review) {
    return NextResponse.redirect(new URL(`/events/${params.id}`, req.url));
  }

  if (review.moderationStatus !== "PENDING") {
    return NextResponse.json(
      { error: "You can only delete reviews that are still pending moderation." },
      { status: 400 }
    );
  }

  await prisma.eventReview.delete({ where: { id: review.id } });

  return NextResponse.redirect(new URL(`/events/${params.id}`, req.url));
}
