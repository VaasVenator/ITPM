import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const refundRequestModel = (prisma as any).refundRequest;
    if (!refundRequestModel) {
      return NextResponse.json({ success: true, refunds: [] }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";

    const refunds = await refundRequestModel.findMany({
      where: { status },
      include: {
        user: true,
        ticket: {
          include: { event: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, refunds }, { status: 200 });
  } catch (error) {
    console.error("Fetch refunds error:", error);
    return NextResponse.json(
      { error: "Failed to fetch refund requests" },
      { status: 500 }
    );
  }
}
