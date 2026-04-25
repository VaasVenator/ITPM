import { expect, test } from "@playwright/test";

test("authenticated user can create an event without an image", async ({ page }) => {
  const suffix = Date.now().toString().slice(-8);
  const itNumber = `IT${suffix}`;
  const username = `e2e_user_${suffix}`;
  const email = `${itNumber}@my.sliit.lk`;
  const password = `P@ssw0rd${suffix}`;

  const signupRes = await page.request.post("/api/auth/signup", {
    data: {
      username,
      itNumber,
      email,
      profileImage: "",
      password,
      confirmPassword: password
    }
  });

  expect(signupRes.ok()).toBeTruthy();

  await page.goto("/create-event");

  await expect(page).toHaveURL(/\/create-event/);

  const today = new Date().toISOString().slice(0, 10);

  await page.locator('input[name="name"]').fill(`E2E Optional Image Event ${Date.now()}`);
  await page.locator('input[name="eventDate"]').fill(today);
  await page.locator('input[name="eventTime"]').fill("10:30");
  await page.locator('input[name="location"]').fill("SLIIT Auditorium");
  await page.locator('textarea[name="description"]').fill("End-to-end test event created without an image.");

  await page.locator('input[name="Team Size"]').fill("11");
  await page.locator('input[name="Equipment Needed"]').fill("Jerseys and balls");

  let successDialogSeen = false;
  page.once("dialog", async (dialog) => {
    successDialogSeen = true;
    await dialog.accept();
  });

  await page.getByRole("button", { name: "Submit for Approval" }).click();

  await expect.poll(() => successDialogSeen).toBeTruthy();
  await expect(page).toHaveURL(/\/$/);
});
