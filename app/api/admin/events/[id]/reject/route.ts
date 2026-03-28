import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const adminComment = String(formData.get("adminComment") || "").trim();

    if (!adminComment) {
      return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id }
    });

    if (!event || event.deleted) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (event.approved) {
      return NextResponse.json({ error: "This event has already been reviewed." }, { status: 400 });
    }

    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("does not exist") && !message.includes("Unknown argument")) {
        throw error;
      }

      await prisma.event.update({
        where: { id: params.id },
        data: {
          approved: false,
          published: false
        }
      });
    }

    return NextResponse.redirect(new URL("/admin?view=pending-events", req.url));
  } catch (error) {
    console.error("Reject event failed:", error);
    return NextResponse.redirect(new URL("/admin?view=pending-events", req.url));
  }
}
