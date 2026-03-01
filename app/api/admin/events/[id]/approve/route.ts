import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const event = await prisma.event.update({
    where: { id: params.id },
    data: { approved: true }
  });

  await prisma.user.update({
    where: { id: event.createdById },
    data: { organiserBadge: true }
  });

  return NextResponse.redirect(new URL("/admin", req.url));
}
