/**
 * Smoke suite skeleton for CI. Run with:
 *   bunx playwright test tests/e2e/smoke.spec.ts
 * Requires: `bun add -D @playwright/test` and `bunx playwright install chromium`.
 *
 * This file is intentionally lightweight so CI can execute it without the
 * full app under test — it exercises public routes only.
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

test("landing renders hero + primary CTA", async ({ page }) => {
  await page.goto(BASE + "/");
  await expect(page).toHaveTitle(/107toFly/i);
  const cta = page.getByRole("link", { name: /empezar|start|dashboard|sign/i }).first();
  await expect(cta).toBeVisible();
});

test("auth page loads with email field", async ({ page }) => {
  await page.goto(BASE + "/auth");
  await expect(page.getByRole("textbox").first()).toBeVisible();
});

test("lessons index responds", async ({ page }) => {
  const res = await page.goto(BASE + "/lessons");
  expect(res?.status()).toBeLessThan(500);
});
