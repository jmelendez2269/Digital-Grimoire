import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

// Uses the persistent local curator account. Keeps the resulting research so
// the curator can open and inspect the real run afterwards. No publication.
async function main() {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3027",
    viewport: { width: 1365, height: 950 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const output = resolve("../.tmp/discovery-verification");
  mkdirSync(output, { recursive: true });
  try {
    await page.goto("/login");
    await page
      .getByLabel("Email", { exact: false })
      .fill("inquiry-admin@prismarium.local");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Prismarium-Local-2026!");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("login"), {
      timeout: 45000,
    });
    await page.goto("/search");
    await page
      .getByLabel("What are you curious about?")
      .waitFor({ timeout: 60000 });
    const consent = page.getByRole("button", { name: "Essential Only" });
    if (
      await consent
        .waitFor({ state: "visible", timeout: 1500 })
        .then(() => true)
        .catch(() => false)
    )
      await consent.click();
    const existing = process.argv
      .find((arg) => arg.startsWith("--run="))
      ?.slice(6);
    const parent = process.argv
      .find((arg) => arg.startsWith("--parent="))
      ?.slice(9);
    let run;
    if (existing) {
      const response = await context.request.get(
        `/api/knowledge/discover?id=${existing}`
      );
      assert.equal(response.status(), 200);
      run = (await response.json()).run;
      await page.goto(`/search?discovery=${existing}`);
    } else {
      const question = process.argv.includes("--followup")
        ? "I've heard Jesus mentioned in relation to alchemy. Can you investigate that?"
        : "WTF is Alchemy?";
      if (parent) {
        await page.goto(`/search?discovery=${parent}`);
        await page
          .getByLabel("Have a hunch or another question?")
          .fill(question);
      } else
        await page.getByLabel("What are you curious about?").fill(question);
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/knowledge/discover") &&
          response.request().method() === "POST",
        { timeout: 300000 }
      );
      await page
        .getByRole("button", {
          name: parent
            ? /^Investigate this connection/
            : /^Explore this question/,
        })
        .click();
      const response = await responsePromise;
      assert.equal(response.status(), 200);
      await page.waitForURL(
        (url) =>
          Boolean(url.searchParams.get("discovery")) &&
          url.searchParams.get("discovery") !== parent,
        { timeout: 300000 }
      );
      const id = new URL(page.url()).searchParams.get("discovery");
      const persisted = await context.request.get(
        `/api/knowledge/discover?id=${id}`
      );
      assert.equal(persisted.status(), 200);
      run = (await persisted.json()).run;
    }
    writeFileSync(
      resolve(output, `${run.id}.json`),
      JSON.stringify(run, null, 2)
    );
    assert.ok(run.result.sources.length > 0, "Retrieved real sources");
    assert.ok(
      run.result.overview.length > 0,
      "Explained the starting question"
    );
    assert.ok(
      run.result.connections.length > 0,
      "Discovered supported connections"
    );
    if (parent)
      assert.equal(run.parent_id, parent, "Follow-up retains its parent");
    await page
      .getByRole("heading", { name: "Connections worth following" })
      .waitFor({ timeout: 15000 });
    if (await consent.isVisible()) await consent.click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: resolve(output, "research-desktop.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Save to Journal", exact: true })
      .first()
      .click();
    const saved = page
      .getByRole("link", { name: "Saved · Open in Journal" })
      .first();
    await saved.waitFor();
    const inquiryUrl = await saved.getAttribute("href");
    assert.ok(inquiryUrl);
    const retrySave = await context.request.post(
      `/api/knowledge/discover/${run.id}/save`,
      { data: { index: 0 } }
    );
    assert.equal(retrySave.status(), 200);
    assert.equal(
      `/journal/research/${(await retrySave.json()).inquiryId}`,
      inquiryUrl
    );
    const guest = await browser.newContext({
      baseURL: "http://127.0.0.1:3027",
    });
    assert.equal(
      (
        await guest.request.get(`/api/knowledge/discover?id=${run.id}`)
      ).status(),
      401
    );
    assert.equal(
      (
        await guest.request.post(`/api/knowledge/discover/${run.id}/save`, {
          data: { index: 0 },
        })
      ).status(),
      401
    );
    await guest.close();
    const inquiry = await (
      await context.request.get(`/api/inquiries/${inquiryUrl.split("/").pop()}`)
    ).json();
    assert.ok(
      inquiry.findings.some(
        (f: { status: string; discovery_id: string }) =>
          f.status === "draft" && f.discovery_id === run.id
      )
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true
    );
    await page.screenshot({
      path: resolve(output, "research-mobile.png"),
      fullPage: true,
    });
    await page.reload();
    await page
      .getByRole("heading", { name: "Connections worth following" })
      .waitFor();
    if (run.parent_id) {
      await page
        .getByRole("navigation", { name: "Discovery trail" })
        .getByRole("button")
        .first()
        .click();
      await page.waitForURL(
        (url) => url.searchParams.get("discovery") === run.root_id
      );
      await page.reload();
      await page
        .getByRole("heading", { name: "Connections worth following" })
        .waitFor();
    }
    await page.goto("/seven-lenses");
    await page.locator("#query").fill("How do symbols acquire meaning?");
    await page
      .getByText("Investigate sources and discover deeper connections", {
        exact: true,
      })
      .click();
    assert.equal(
      await page.getByLabel("What are you curious about?").inputValue(),
      "How do symbols acquire meaning?",
      "Seven Lenses carries the current question into discovery"
    );
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          run: run.id,
          url: `http://127.0.0.1:3027/search?discovery=${run.id}`,
          questions: run.result.searched,
          sources: run.result.sources.length,
          connections: run.result.connections.map(
            (c: { title: string }) => c.title
          ),
          warnings: run.result.warnings,
          cost: run.result.usage.reduce(
            (n: number, u: { cost: number | null }) => n + (u.cost || 0),
            0
          ),
          inquiryUrl,
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
