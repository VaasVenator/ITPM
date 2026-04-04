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

    if (!adminComment) {
      return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
    }

    const review = await prisma.eventReview.findUnique({ where: { id: params.id } });

    if (!review) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    if (review.moderationStatus !== "PENDING") {
      return NextResponse.json({ error: "This review has already been moderated." }, { status: 400 });
    }

    await prisma.eventReview.update({
      where: { id: params.id },
      data: {
        moderationStatus: "REJECTED",
        adminComment,
        moderatedAt: new Date()
      }
    });

    return NextResponse.redirect(new URL("/admin?view=pending-reviews", req.url));
  } catch (error) {
    console.error("Reject review failed:", error);
    return NextResponse.redirect(new URL("/admin?view=pending-reviews", req.url));
  }
}
