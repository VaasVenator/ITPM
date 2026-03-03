import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTicketApprovedEmail } from "@/lib/mailer";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ticket = await prisma.ticket.update({
    where: { id: params.id },
    data: { approved: true },
    include: { user: true, event: true }
  });

  try {
    await sendTicketApprovedEmail({
      to: ticket.user.email,
      userName: ticket.user.name,
      eventTitle: ticket.event.name
    });
  } catch (error) {
    console.error("Failed to send payment verification email:", error);
  }

  return NextResponse.redirect(new URL("/admin?view=pending-tickets", req.url));
}
