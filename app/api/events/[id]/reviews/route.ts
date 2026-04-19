import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/server-auth";
import { eventReviewSchema } from "@/lib/validators";

type ReviewPayload = {
  rating: number;
  comment: string;
  anonymous: boolean;
};

function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (!value) return false;
  const normalized = String(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

async function parsePayload(req: NextRequest): Promise<ReviewPayload> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    return {
      rating: Number(body?.rating),
      comment: String(body?.comment || ""),
      anonymous: Boolean(body?.anonymous)
    };
  }

  const formData = await req.formData();
  return {
    rating: Number(formData.get("rating")),
    comment: String(formData.get("comment") || ""),
    anonymous: parseBoolean(formData.get("anonymous"))
  };
}

function isMissingReviewTableError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("eventreview") || message.includes("does not exist") || message.includes("unknown argument");
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventReviewModel = (prisma as any).eventReview;
    if (!eventReviewModel) {
      return NextResponse.json(
        { error: "Review data is not available yet in this database." },
        { status: 503 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true, deleted: true, approved: true, published: true }
    });

    if (!event || event.deleted || !event.approved || !event.published) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const reviews = await eventReviewModel.findMany({
      where: {
        eventId: params.id,
        moderationStatus: "APPROVED"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews === 0
        ? 0
        : Number((reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / totalReviews).toFixed(1));

    return NextResponse.json({
      averageRating,
      totalReviews,
      reviews: reviews.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        anonymous: review.anonymous,
        createdAt: review.createdAt,
        reviewer: review.anonymous ? null : review.user
      }))
    });
  } catch (error) {
    if (isMissingReviewTableError(error)) {
      return NextResponse.json(
        { error: "Review data is not available yet in this database." },
        { status: 503 }
      );
    }
    throw error;
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventReviewModel = (prisma as any).eventReview;
    if (!eventReviewModel) {
      return NextResponse.json(
        { error: "Review data is not available yet in this database." },
        { status: 503 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", `/events/${params.id}`);
      return NextResponse.redirect(loginUrl);
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true, date: true, deleted: true, approved: true, published: true }
    });

    if (!event || event.deleted || !event.approved || !event.published) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (new Date(event.date).getTime() > Date.now()) {
      return NextResponse.json({ error: "Reviews are only allowed after the event date." }, { status: 400 });
    }

    const payload = await parsePayload(req);
    const parsed = eventReviewSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid review payload." },
        { status: 400 }
      );
    }

    const existingReview = await eventReviewModel.findUnique({
      where: {
        eventId_userId: {
          eventId: params.id,
          userId: user.id
        }
      }
    });

    if (existingReview && existingReview.moderationStatus !== "PENDING") {
      return NextResponse.json(
        { error: "You cannot edit a review after it has been moderated." },
        { status: 400 }
      );
    }

    if (existingReview) {
      await eventReviewModel.update({
        where: { id: existingReview.id },
        data: {
          rating: parsed.data.rating,
          comment: parsed.data.comment,
          anonymous: Boolean(parsed.data.anonymous)
        }
      });
    } else {
      await eventReviewModel.create({
        data: {
          eventId: params.id,
          userId: user.id,
          rating: parsed.data.rating,
          comment: parsed.data.comment,
          anonymous: Boolean(parsed.data.anonymous)
        }
      });
    }

    return NextResponse.redirect(new URL(`/events/${params.id}`, req.url));
  } catch (error) {
    if (isMissingReviewTableError(error)) {
      return NextResponse.json(
        { error: "Review data is not available yet in this database." },
        { status: 503 }
      );
    }
    throw error;
  }
}
