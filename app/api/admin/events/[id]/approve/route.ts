import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const adminComment = String(formData.get("adminComment") || "").trim();

    const event = await prisma.event.findUnique({
      where: { id: params.id }
    });

    if (!event || event.deleted) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (event.approved) {
      return NextResponse.json({ error: "This event has already been reviewed." }, { status: 400 });
    }

    let updatedEvent;
    try {
      updatedEvent = await prisma.event.update({
        where: { id: params.id },
        data: {
          approved: true,
          reviewStatus: "APPROVED",
          adminComment: adminComment || "Approved by admin",
          reviewedAt: new Date()
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("does not exist") && !message.includes("Unknown argument")) {
        throw error;
      }

      updatedEvent = await prisma.event.update({
        where: { id: params.id },
        data: {
          approved: true
        }
      });
    }

    await prisma.user.update({
      where: { id: updatedEvent.createdById },
      data: { organiserBadge: true }
    });

    return NextResponse.redirect(new URL("/admin?view=pending-events", req.url));
  } catch (error) {
    console.error("Approve event failed:", error);
    return NextResponse.redirect(new URL("/admin?view=pending-events", req.url));
  }
}
