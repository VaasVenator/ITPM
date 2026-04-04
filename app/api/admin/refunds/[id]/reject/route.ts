import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { sendRefundRejectedEmail } from "@/lib/mailer";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const refundRequestModel = (prisma as any).refundRequest;
    if (!refundRequestModel) {
      return NextResponse.json({ error: "Refunds are not available in this database yet" }, { status: 501 });
    }

    const formData = await req.formData();
    const adminComment = String(formData.get("adminComment") || "").trim();

    if (!adminComment) {
      return NextResponse.json(
        { error: "Admin comment is required for rejection" },
        { status: 400 }
      );
    }

    const refundRequest = await refundRequestModel.findUnique({
      where: { id: params.id },
      include: { user: true, ticket: { include: { event: true } } }
    });

    if (!refundRequest) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    if (refundRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "This refund has already been reviewed" },
        { status: 400 }
      );
    }

    const updatedRefund = await refundRequestModel.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        adminComment,
        reviewedAt: new Date()
      },
      include: { user: true, ticket: { include: { event: true } } }
    });

    try {
      await sendRefundRejectedEmail({
        to: updatedRefund.user.email,
        userName: updatedRefund.user.name,
        eventTitle: updatedRefund.ticket.event.name,
        reason: adminComment
      });
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
    }

    return NextResponse.json(
      { success: true, message: "Refund rejected successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Refund rejection error:", error);
    return NextResponse.json(
      { error: "Failed to reject refund" },
      { status: 500 }
    );
  }
}
