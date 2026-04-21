import { test, expect } from "@playwright/test";

test("admin page opens", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/.*admin/);
});