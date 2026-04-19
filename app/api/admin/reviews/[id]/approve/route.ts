import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const eventReviewModel = (prisma as any).eventReview;
    if (!eventReviewModel) {
      return NextResponse.json({ error: "Reviews are not available in this database yet." }, { status: 501 });
    }

    const user = await getSessionUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const adminComment = String(formData.get("adminComment") || "").trim();

    const review = await eventReviewModel.findUnique({ where: { id: params.id } });

    if (!review) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    if (review.moderationStatus !== "PENDING") {
      return NextResponse.json({ error: "This review has already been moderated." }, { status: 400 });
    }

    await eventReviewModel.update({
      where: { id: params.id },
      data: {
        moderationStatus: "APPROVED",
        adminComment: adminComment || "Approved by admin",
        moderatedAt: new Date()
      }
    });

    return NextResponse.redirect(new URL("/admin?view=pending-reviews", req.url));
  } catch (error) {
    console.error("Approve review failed:", error);
    return NextResponse.redirect(new URL("/admin?view=pending-reviews", req.url));
  }
}
