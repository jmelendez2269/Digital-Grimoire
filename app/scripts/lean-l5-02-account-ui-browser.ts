import assert from "node:assert/strict";
import { resolve } from "node:path";

import { chromium, type Page } from "playwright-core";

const APP_URL = "http://127.0.0.1:3015";
const FIXTURE_EMAIL = "lean-l5-02-account-ui@example.test";
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const password = required("LEAN_L5_02_FIXTURE_PASSWORD");

async function assertAccountSurface(page: Page) {
  await page.getByText("Current plan", { exact: true }).waitFor();
  const bodyText = (await page.locator("body").innerText()).replace(
    /\s+/g,
    " "
  );

  assert.match(bodyText, /Current plan Student/);
  assert.match(bodyText, /\$15\/month/);
  assert.match(bodyText, /Founding rate/);
  assert.match(bodyText, /Billing status Active/);
  assert.match(bodyText, /Scheduled to end on September 1, 2026/);
  assert.match(bodyText, /Cancellation is scheduled/);
  assert.match(bodyText, /Billing operations are safely closed/);
  assert.doesNotMatch(bodyText, /Subscribe|Upgrade|Start checkout/i);

  assert.equal(
    await page
      .locator('a[href*="checkout"], button:has-text("Checkout")')
      .count(),
    0
  );
  assert.equal(
    await page
      .locator(
        "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay"
      )
      .count(),
    0
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    ),
    true
  );
}

async function dismissCookieConsent(page: Page) {
  const essentialOnly = page.getByRole("button", { name: "Essential Only" });
  if (await essentialOnly.isVisible()) {
    await essentialOnly.click();
    await essentialOnly.waitFor({ state: "hidden" });
  }
}

async function main() {
  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const httpErrors: string[] = [];
  const authHosts = new Set<string>();
  let billingSummaryStatus: number | null = null;
  let portalRequests = 0;

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.includes("/auth/v1/")) authHosts.add(url.host);
    if (url.pathname === "/api/stripe/create-portal-session")
      portalRequests += 1;
  });
  page.on("response", (response) => {
    const responseUrl = new URL(response.url());
    if (response.status() >= 400) {
      httpErrors.push(`${response.status()} ${responseUrl.pathname}`);
    }
    if (responseUrl.pathname === "/api/membership/billing-summary") {
      billingSummaryStatus = response.status();
    }
  });

  try {
    await page.goto(
      `${APP_URL}/login?redirect=%2Fprofile%3Ftab%3Dsubscription`,
      { waitUntil: "domcontentloaded", timeout: 60_000 }
    );
    const clientBundle = await page
      .locator("script[src]")
      .evaluateAll(async (scripts) =>
        (
          await Promise.all(
            scripts.map((script) =>
              fetch((script as HTMLScriptElement).src).then((response) =>
                response.text()
              )
            )
          )
        ).join("\n")
      );
    assert.match(clientBundle, /127\.0\.0\.1:\d+/);
    assert.doesNotMatch(clientBundle, /ukguqtghfglirszsqqdj/);
    await dismissCookieConsent(page);

    await page.getByLabel("Email Address").fill(FIXTURE_EMAIL);
    await page.getByLabel("Password").fill(password);
    await Promise.all([
      page.waitForRequest(
        (request) =>
          new URL(request.url()).hostname === "127.0.0.1" &&
          new URL(request.url()).pathname.includes("/auth/v1/token")
      ),
      page.getByLabel("Password").press("Enter"),
    ]);
    await page.waitForURL("**/profile?tab=subscription", { timeout: 60_000 });
    await page
      .getByText("Current plan", { exact: true })
      .waitFor({ timeout: 60_000 });
    await dismissCookieConsent(page);

    await assertAccountSurface(page);
    await page.screenshot({
      path: resolve(
        process.cwd(),
        "../docs/audits/lean-l5-02-account-billing-mobile-2026-08-12.png"
      ),
      fullPage: true,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await dismissCookieConsent(page);
    await assertAccountSurface(page);
    await page.screenshot({
      path: resolve(
        process.cwd(),
        "../docs/audits/lean-l5-02-account-billing-desktop-2026-08-12.png"
      ),
      fullPage: true,
    });

    assert.ok(
      authHosts.size > 0 &&
        [...authHosts].every((host) => host.startsWith("127.0.0.1:"))
    );
    assert.equal(billingSummaryStatus, 200);
    assert.equal(portalRequests, 0);
    assert.ok(
      consoleErrors.every(
        (message) =>
          message ===
            "Failed to load resource: the server responded with a status of 404 (Not Found)" ||
          message.startsWith(
            "[AuthContext] API admin check error: TypeError: Failed to fetch"
          )
      )
    );
    assert.ok(httpErrors.every((error) => error === "404 /grid.svg"));

    console.log(
      JSON.stringify({
        result: "pass",
        viewports: ["375x812", "1440x900"],
        authTarget: "local",
        billingSummaryStatus,
        portalRequests,
        checkoutLinks: 0,
        billingUiErrors: 0,
        knownShellConsoleErrors: consoleErrors.length,
        knownShellHttpErrors: [...new Set(httpErrors)],
        horizontalOverflow: false,
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        authHosts: [...authHosts],
        pageUrl: page.url(),
        pageText: (
          await page
            .locator("body")
            .innerText()
            .catch(() => "")
        )
          .replace(/\s+/g, " ")
          .slice(0, 500),
        httpErrors,
      })
    );
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Browser check failed"
  );
  process.exitCode = 1;
});
