import { expect, test } from "@playwright/test";

test("authenticated user can update details from profile page", async ({ page }) => {
  const suffix = Date.now().toString().slice(-8);
  const initialItNumber = `IT${suffix}`;
  const username = `e2e_profile_${suffix}`;
  const password = `P@ssw0rd${suffix}`;

  const signupRes = await page.request.post("/api/auth/signup", {
    data: {
      username,
      itNumber: initialItNumber,
      email: `${initialItNumber}@my.sliit.lk`,
      profileImage: "",
      password,
      confirmPassword: password
    }
  });

  expect(signupRes.ok()).toBeTruthy();

  try {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();

    const updatedName = `Updated ${suffix}`;
    const updatedUsername = `e2e_updated_${suffix}`;
    const updatedItNumber = `IT${Number(suffix) + 1}`;
    const updatedEmail = `${updatedItNumber}@my.sliit.lk`;

    const nameInput = page.locator('div:has(> label:has-text("Full Name")) input');
    const usernameInput = page.locator('div:has(> label:has-text("Username")) input');
    const itNumberInput = page.locator('div:has(> label:has-text("Student Identification Number")) input');
    const emailInput = page.locator('div:has(> label:has-text("University Email")) input');

    await nameInput.fill(updatedName);
    await usernameInput.fill(updatedUsername);
    await itNumberInput.fill(updatedItNumber);
    await emailInput.fill(updatedEmail);

    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByText("Profile updated successfully.")).toBeVisible();

    await page.reload();

    await expect(nameInput).toHaveValue(updatedName);
    await expect(usernameInput).toHaveValue(updatedUsername);
    await expect(itNumberInput).toHaveValue(updatedItNumber);
    await expect(emailInput).toHaveValue(updatedEmail.toLowerCase());
  } finally {
    await page.request.delete("/api/profile");
  }
});
