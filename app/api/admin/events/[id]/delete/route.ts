import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.event.updateMany({
    where: { id: params.id },
    data: { deleted: true, published: false }
  });

  const referer = req.headers.get("referer");
  const redirectTo = referer ? new URL(referer) : new URL("/", req.url);
  return NextResponse.redirect(redirectTo);
}
