import { expect, test } from "@playwright/test";

test("authenticated user can log in and open the profile page", async ({ page }) => {
  const identifier = process.env.E2E_LOGIN_IDENTIFIER;
  const password = process.env.E2E_LOGIN_PASSWORD;

  test.skip(
    !identifier || !password,
    "Set E2E_LOGIN_IDENTIFIER and E2E_LOGIN_PASSWORD to run this scenario."
  );

  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/login?redirect=/profile");
  await page.getByPlaceholder("Username or email").fill(identifier);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete Account" })).toBeVisible();
  await expect(page.locator("text=Role:")).toBeVisible();

  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === "session_token")).toBeTruthy();
});