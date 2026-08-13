import assert from "node:assert/strict";
import { resolve } from "node:path";

import { chromium, type Page } from "playwright-core";

const APP_URL = "http://127.0.0.1:3016";
const FIXTURE_EMAIL = "lean-l5-03-wallet-ui@example.test";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const password = required("LEAN_L5_03_FIXTURE_PASSWORD");

async function dismissCookieConsent(page: Page) {
  const essentialOnly = page.getByRole("button", { name: "Essential Only" });
  const appeared = await essentialOnly
    .waitFor({ state: "visible", timeout: 1_500 })
    .then(() => true)
    .catch(() => false);
  if (appeared) {
    await essentialOnly.click();
    await essentialOnly.waitFor({ state: "hidden" });
  }
}

async function assertNoOverflowOrOverlay(page: Page) {
  assert.equal(
    await page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay").count(),
    0,
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
}

async function assertWallet(page: Page) {
  await page.getByText("Your monthly wallet", { exact: true }).waitFor();
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  assert.match(text, /Available (7|9)/);
  assert.match(text, /Reserved (2|0)/);
  assert.match(text, /Current total 9/);
  assert.match(text, /Resets .* UTC/);
  assert.match(text, /The Working completed/);
  assert.match(text, /Standard Seven Lenses returned/);
  assert.match(text, /Standard Seven Lenses reserved/);
  assert.match(text, /Pending reservations/);
  assert.match(text, /Reading, ordinary search, Graph, Journal/);
  assert.doesNotMatch(text, /Checkout|Subscribe|Upgrade|Start checkout/i);
  await page.getByRole("button", { name: "Refresh" }).focus();
  assert.equal(await page.getByRole("button", { name: "Refresh" }).evaluate((element) => element === document.activeElement), true);
  await assertNoOverflowOrOverlay(page);
}

async function assertClosedTool(page: Page, route: string, label: string, input: string) {
  await page.goto(`${APP_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await dismissCookieConsent(page);
  await page.getByText(/credits? required; this generation action is safely closed/i).waitFor();
  const textbox = page.getByRole("textbox").last();
  await textbox.fill(input);
  assert.equal(await textbox.inputValue(), input);
  const submit = page.getByRole("button", { name: new RegExp(label, "i") });
  assert.equal(await submit.isDisabled(), true);
  await textbox.focus();
  assert.equal(await textbox.evaluate((element) => element === document.activeElement), true);
  await assertNoOverflowOrOverlay(page);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const httpErrors: string[] = [];
  const blockedExternalRequests: string[] = [];
  const authHosts = new Set<string>();
  const statuses = new Map<string, number>();
  let meteredPosts = 0;

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.includes("/auth/v1/")) authHosts.add(url.host);
    if (
      request.method() === "POST" &&
      (url.pathname === "/api/working/generate" ||
        url.pathname === "/api/parallax/query" ||
        url.pathname.startsWith("/api/parallax/lens/"))
    ) {
      meteredPosts += 1;
    }
  });
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText.includes("ERR_NETWORK_ACCESS_DENIED")) {
      blockedExternalRequests.push(request.url());
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${url.pathname}`);
    if (url.pathname === "/api/membership/wallet" || url.pathname === "/api/membership/tool-costs") {
      statuses.set(url.pathname, response.status());
    }
  });

  try {
    await page.goto(`${APP_URL}/login?redirect=%2Fprofile%3Ftab%3Dcredits`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const clientBundle = await page.locator("script[src]").evaluateAll(async (scripts) =>
      (await Promise.all(scripts.map((script) => fetch((script as HTMLScriptElement).src).then((response) => response.text())))).join("\n"),
    );
    assert.match(clientBundle, /127\.0\.0\.1:\d+/);
    assert.doesNotMatch(clientBundle, /ukguqtghfglirszsqqdj/);
    await dismissCookieConsent(page);

    let signedIn = false;
    for (let attempt = 0; attempt < 3 && !signedIn; attempt += 1) {
      if (!page.url().includes("redirect=")) {
        await page.goto(
          `${APP_URL}/login?redirect=%2Fprofile%3Ftab%3Dcredits`,
          { waitUntil: "domcontentloaded", timeout: 60_000 },
        );
      }
      await dismissCookieConsent(page);
      await page.getByLabel("Email Address").fill(FIXTURE_EMAIL);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: /^Sign In/ }).click({ force: true });
      signedIn = await page
        .waitForURL("**/profile?tab=credits", { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      if (!signedIn) await page.waitForTimeout(1_000);
    }
    assert.equal(signedIn, true, "Local fixture sign-in did not complete");
    await dismissCookieConsent(page);
    await assertWallet(page);
    await page.screenshot({
      path: resolve(process.cwd(), "../docs/audits/lean-l5-03-wallet-mobile-2026-08-12.png"),
      fullPage: true,
    });

    await assertClosedTool(page, "/workbench/the-working", "Begin the working", "clarity before a decision");
    await assertClosedTool(page, "/seven-lenses", "Analyze", "How should a difficult choice be examined?");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${APP_URL}/profile?tab=credits`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await dismissCookieConsent(page);
    await assertWallet(page);
    await page.screenshot({
      path: resolve(process.cwd(), "../docs/audits/lean-l5-03-wallet-desktop-2026-08-12.png"),
      fullPage: true,
    });
    await assertClosedTool(page, "/workbench/the-working", "Begin the working", "clarity before a decision");
    await assertClosedTool(page, "/seven-lenses", "Analyze", "How should a difficult choice be examined?");

    assert.ok(authHosts.size > 0 && [...authHosts].every((host) => host.startsWith("127.0.0.1:")));
    assert.equal(statuses.get("/api/membership/wallet"), 200);
    assert.equal(statuses.get("/api/membership/tool-costs"), 200);
    assert.equal(meteredPosts, 0);
    assert.ok(blockedExternalRequests.every((url) => {
      const target = new URL(url);
      return target.hostname !== "127.0.0.1" && target.hostname !== "localhost";
    }));
    assert.ok(consoleErrors.every((message) =>
      message === "Failed to load resource: the server responded with a status of 404 (Not Found)" ||
      message === "Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED" ||
      message.startsWith("[AuthContext] API admin check error:") ||
      message.startsWith("Error loading history from API: TypeError: Failed to fetch"),
    ));
    assert.ok(httpErrors.every((error) =>
      error === "404 /grid.svg" ||
      error === "404 /api/user/parallax-preferences",
    ));

    console.log(JSON.stringify({
      result: "pass",
      viewports: ["375x812", "1440x900"],
      authTarget: "local",
      walletStatus: statuses.get("/api/membership/wallet"),
      toolCostsStatus: statuses.get("/api/membership/tool-costs"),
      meteredPosts,
      checkoutLinks: 0,
      keyboardFocus: true,
      inputPreserved: true,
      horizontalOverflow: false,
      knownShellConsoleErrors: consoleErrors.length,
      knownShellHttpErrors: [...new Set(httpErrors)],
      blockedExternalHosts: [...new Set(blockedExternalRequests.map((url) => new URL(url).host))],
    }));
  } catch (error) {
    console.error(JSON.stringify({
      authHosts: [...authHosts],
      pageUrl: page.url(),
      pageText: (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 700),
      httpErrors,
      consoleErrors,
    }));
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Browser check failed");
  process.exitCode = 1;
});
