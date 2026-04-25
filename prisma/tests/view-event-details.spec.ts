import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test("user can open an event details page and view core details", async ({ page }) => {
  const suffix = Date.now().toString().slice(-8);
  const organiser = await prisma.user.create({
    data: {
      name: `E2E Organiser ${suffix}`,
      username: `e2e_organiser_${suffix}`,
      itNumber: `IT${suffix}`,
      email: `IT${suffix}@my.sliit.lk`,
      password: `temporary-${suffix}`,
      organiserBadge: true
    },
    select: { id: true, name: true }
  });

  const event = await prisma.event.create({
    data: {
      name: `E2E View Details Event ${suffix}`,
      category: "SPORTS",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      location: "SLIIT Main Ground",
      description: "Event details test scenario.",
      customFields: {
        TeamSize: "11",
        EquipmentNeeded: "Jerseys"
      },
      ticketRequired: false,
      approved: true,
      published: true,
      cancelled: false,
      deleted: false,
      createdById: organiser.id
    },
    select: { id: true, name: true, location: true }
  });

  try {
    await page.goto(`/events/${event.id}`);

    await expect(page).toHaveURL(new RegExp(`/events/${event.id}$`));
    await expect(page.getByRole("heading", { name: event.name })).toBeVisible();
    await expect(page.getByText(event.location)).toBeVisible();
    await expect(page.getByText(organiser.name)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Join this event" })).toBeVisible();
  } finally {
    await prisma.event.deleteMany({ where: { id: event.id } });
    await prisma.user.deleteMany({ where: { id: organiser.id } });
  }
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
