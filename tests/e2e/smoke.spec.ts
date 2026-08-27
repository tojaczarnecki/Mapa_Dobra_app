import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const adminEmail = process.env.ADMIN_SEED_EMAIL ?? "e2e-admin@example.test";
const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? "E2E-only-password-123!";

async function expectSeriousA11y(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
  expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
}

test.describe("public critical paths", () => {
  test("homepage exposes the two primary actions and is accessible @webkit-smoke", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Potrzebuję pomocy/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Uruchamiam pomoc/i })).toBeVisible();
    await expectSeriousA11y(page);
  });

  test("search supports query and controlled empty state", async ({ page }) => {
    await page.goto("/szukaj");
    await page.getByRole("textbox", { name: /Czego szukasz/i }).fill("E2E");
    await page.getByRole("textbox", { name: /Czego szukasz/i }).press("Enter");
    await expect(page).toHaveURL(/\/szukaj\?q=E2E/);
    await expect(page.getByText(/E2E Miejsce|Nie znaleźliśmy miejsc/i).first()).toBeVisible();
    await expectSeriousA11y(page);
  });

  test("map and accommodation routes render their shells", async ({ page }) => {
    await page.goto("/mapa");
    await expect(page.getByText(/mapie|Mapa/i).first()).toBeVisible();
    await page.goto("/znajdz-nocleg");
    await expect(page.getByText(/nocleg|E2E Miejsce/i).first()).toBeVisible();
  });

  test("public place detail renders the seeded place", async ({ page }) => {
    await page.goto("/lodz/jedzenie/e2e-place-1");
    await expect(page.getByRole("heading", { name: "E2E Miejsce 1" })).toBeVisible();
    await expectSeriousA11y(page);
  });

  test("help request and public submission routes open without provider dependencies", async ({ page }) => {
    await page.goto("/uruchom-pomoc");
    await expect(page.getByRole("heading", { name: /Martwisz się o kogoś/i })).toBeVisible();
    await page.goto("/zglos-miejsce");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("mobile navigation and keyboard focus remain usable", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    await expect(page.getByRole("navigation").last()).toBeVisible();
  });

  test("manifest and service worker are available", async ({ page }) => {
    await page.goto("/");
    await expect((await page.request.get("/manifest.webmanifest")).ok()).toBeTruthy();
    await expect((await page.request.get("/sw.js")).ok()).toBeTruthy();
  });
});

test.describe("admin critical paths", () => {
  test("admin login reaches dashboard and place edit", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/e-mail/i).fill(adminEmail);
    await page.getByLabel(/hasło/i).fill(adminPassword);
    await page.getByRole("button", { name: /zaloguj/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText(/Do zrobienia/i)).toBeVisible();
    await page.goto("/admin/miejsca");
    await page.locator("li").filter({ hasText: "E2E Miejsce 1" }).getByRole("link", { name: "Edytuj" }).click();
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expectSeriousA11y(page);
  });

  test("admin dashboard is accessible", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/e-mail/i).fill(adminEmail);
    await page.getByLabel(/hasło/i).fill(adminPassword);
    await page.getByRole("button", { name: /zaloguj/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expectSeriousA11y(page);
  });
});
