import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { sendRefundApprovedEmail } from "@/lib/mailer";

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
        status: "APPROVED",
        adminComment: adminComment || "Approved by admin",
        reviewedAt: new Date()
      },
      include: { user: true, ticket: { include: { event: true } } }
    });

    try {
      await sendRefundApprovedEmail({
        to: updatedRefund.user.email,
        userName: updatedRefund.user.name,
        eventTitle: updatedRefund.ticket.event.name,
        amount: updatedRefund.amount.toString()
      });
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
    }

    return NextResponse.json(
      { success: true, message: "Refund approved successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Refund approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve refund" },
      { status: 500 }
    );
  }
}
