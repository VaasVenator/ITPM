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

    const event = await prisma.event.findUnique({
      where: { id: params.id }
    });

    if (!event || event.deleted) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.reviewStatus !== "PENDING") {
      return NextResponse.json(
        { error: "This event has already been reviewed" },
        { status: 400 }
      );
    }

    await prisma.event.update({
      where: { id: params.id },
      data: {
        approved: false,
        published: false,
        reviewStatus: "REJECTED",
        adminComment,
        reviewedAt: new Date()
      }
    });

    return NextResponse.json(
      { success: true, message: "Event rejected successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Event rejection error:", error);
    return NextResponse.json(
      { error: "Failed to reject event" },
      { status: 500 }
    );
  }
}