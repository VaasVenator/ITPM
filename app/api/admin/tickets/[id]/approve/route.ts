import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { sendTicketApprovedEmail } from "@/lib/mailer";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const adminComment = String(formData.get("adminComment") || "").trim();

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.reviewStatus !== "PENDING") {
      return NextResponse.json(
        { error: "This ticket has already been reviewed" },
        { status: 400 }
      );
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        reviewStatus: "APPROVED",
        adminComment: adminComment || "Approved by admin",
        reviewedAt: new Date()
      },
      include: { user: true, event: true }
    });

    try {
      await sendTicketApprovedEmail({
        to: updatedTicket.user.email,
        userName: updatedTicket.user.name,
        eventTitle: updatedTicket.event.name
      });
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
    }

    return NextResponse.json(
      { success: true, message: "Ticket approved successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Ticket approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve ticket" },
      { status: 500 }
    );
  }
}
