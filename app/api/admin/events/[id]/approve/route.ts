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

    const updatedEvent = await prisma.event.update({
      where: { id: params.id },
      data: {
        approved: true,
        published: true,
        reviewStatus: "APPROVED",
        adminComment: adminComment || "Approved by admin",
        reviewedAt: new Date()
      }
    });

    await prisma.user.update({
      where: { id: updatedEvent.createdById },
      data: { organiserBadge: true }
    });

    return NextResponse.json(
      { success: true, message: "Event approved and published successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Event approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve event" },
      { status: 500 }
    );
  }
}