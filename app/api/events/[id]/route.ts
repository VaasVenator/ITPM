import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/server-auth";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({ where: { id: params.id }, include: { createdBy: true, sponsors: true } });
  if (!event || event.deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const form = await req.formData();
  const action = String(form.get("action") || "");

  if (action === "publishWithoutSponsors") {
    await prisma.event.updateMany({
      where: { id: params.id, createdById: user.id, approved: true },
      data: { sponsorsReady: true, sponsorRequested: false, published: true }
    });
    return NextResponse.redirect(new URL("/my-events", req.url));
  }

  return NextResponse.redirect(new URL("/my-events", req.url));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updateData: Record<string, boolean | string | null> = {};

  if (typeof body.eventImage === "string") {
    updateData.eventImage = body.eventImage.trim() || null;
  }

  if (typeof body.published === "boolean") {
    updateData.published = body.published;
  }

  if (typeof body.sponsorRequested === "boolean") {
    updateData.sponsorRequested = body.sponsorRequested;
  }

  if (typeof body.sponsorsReady === "boolean") {
    updateData.sponsorsReady = body.sponsorsReady;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid event updates provided." }, { status: 400 });
  }

  const updated = await prisma.event.updateMany({
    where: { id: params.id, createdById: user.id, approved: true },
    data: updateData
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Event could not be updated." }, { status: 404 });
  }

  return NextResponse.json({ updated: updated.count });
}
