import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const adminComment = String(formData.get("adminComment") || "").trim();

    if (!adminComment) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

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

    await prisma.ticket.update({
      where: { id: params.id },
      data: {
        reviewStatus: "REJECTED",
        adminComment,
        reviewedAt: new Date()
      }
    });

    return NextResponse.json(
      { success: true, message: "Ticket rejected successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Ticket rejection error:", error);
    return NextResponse.json(
      { error: "Failed to reject ticket" },
      { status: 500 }
    );
  }
}
