import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();

    const ticketId = String(formData.get("ticketId") || "").trim();
    const action = String(formData.get("action") || "").trim();
    const adminComment = String(formData.get("adminComment") || "").trim();

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required." }, { status: 400 });
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Valid action is required." }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { user: true, event: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket request not found." }, { status: 404 });
    }

    if (ticket.reviewStatus !== "PENDING") {
      return NextResponse.json(
        { error: "This ticket slip has already been reviewed." },
        { status: 400 }
      );
    }

    if (action === "reject" && !adminComment) {
      return NextResponse.json(
        { error: "Rejection reason is required." },
        { status: 400 }
      );
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        approved: action === "approve",
        reviewStatus: action === "approve" ? "APPROVED" : "REJECTED",
        adminComment:
          adminComment ||
          (action === "approve" ? "Ticket payment approved" : "Rejected by admin"),
        reviewedAt: new Date()
      }
    });

    return NextResponse.redirect(new URL("/admin?view=pending-tickets", req.url));
  } catch (error) {
    console.error("Ticket admin action error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}