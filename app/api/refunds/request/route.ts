import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendRefundRequestNotification } from "@/lib/mailer";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const ticketId = String(formData.get("ticketId") || "").trim();
    const reason = String(formData.get("reason") || "").trim();

    if (!ticketId || !reason) {
      return NextResponse.json(
        { error: "Ticket ID and reason are required" },
        { status: 400 }
      );
    }

    // Verify ticket exists and belongs to the user
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { event: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if a refund request already exists for this ticket
    const existingRefund = await prisma.refundRequest.findFirst({
      where: {
        ticketId,
        status: { in: ["PENDING", "APPROVED"] }
      }
    });

    if (existingRefund) {
      return NextResponse.json(
        { error: "A refund request already exists for this ticket" },
        { status: 400 }
      );
    }

    // Create refund request
    const refundRequest = await prisma.refundRequest.create({
      data: {
        ticketId,
        userId: user.id,
        amount: ticket.price,
        reason,
        status: "PENDING"
      },
      include: { ticket: true, user: true }
    });

    // Send notification to all admins
    try {
      const admins = await prisma.user.findMany({
        where: { role: "admin" },
        select: { email: true, name: true }
      });

      if (admins.length > 0) {
        const promises = admins.map(admin =>
          sendRefundRequestNotification({
            to: admin.email,
            userName: user.name,
            userEmail: user.email,
            eventTitle: ticket.event.name,
            amount: ticket.price.toString(),
            reason,
            refundId: refundRequest.id
          }).catch(error => {
            console.error(`Failed to send refund notification to ${admin.email}:`, error);
          })
        );
        await Promise.allSettled(promises);
      }
    } catch (emailError) {
      console.error("Error sending refund notification emails:", emailError);
      // Don't fail the refund request if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "Refund request submitted successfully",
        refund: refundRequest
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Refund request error:", error);
    return NextResponse.json(
      { error: "Failed to submit refund request" },
      { status: 500 }
    );
  }
}
