import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, voteType } = await req.json();
  if (!eventId || !voteType) {
    return NextResponse.json({ error: "eventId and voteType required" }, { status: 400 });
  }

  const vote = await prisma.vote.upsert({
    where: {
      userId_eventId_voteType: {
        userId: user.id,
        eventId,
        voteType
      }
    },
    update: {},
    create: {
      userId: user.id,
      eventId,
      voteType
    }
  });

  return NextResponse.json(vote, { status: 201 });
}
