import { expect, test } from "@playwright/test";

test.describe("mock-admin", () => {
  test("login, search ORD-1001, and export CSV", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("demo@example.com");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
    await page.getByLabel("Order search").fill("ORD-1001");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("cell", { name: "ORD-1001" })).toBeVisible();

    await page.getByRole("button", { name: "Export CSV" }).click();
    await page.getByRole("button", { name: "Confirm export" }).click();
    await expect(page.getByText("Export started")).toBeVisible();
  });
});
