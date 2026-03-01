import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { eventId, price, paymentSlip } = body;

  if (!eventId || !paymentSlip) {
    return NextResponse.json({ error: "eventId and paymentSlip required" }, { status: 400 });
  }

  const ticket = await prisma.ticket.create({
    data: {
      eventId,
      userId: user.id,
      price,
      paymentSlip,
      approved: false
    }
  });

  return NextResponse.json(ticket, { status: 201 });
}
