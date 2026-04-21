import { test, expect } from "@playwright/test";

test("refund page opens", async ({ page }) => {
  await page.goto("/events/test/refund");
  await expect(page.locator("body")).toBeVisible();
});