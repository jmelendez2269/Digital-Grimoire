import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Page } from "playwright-core";

// Uses only dedicated local fixtures and saved research; no AI generation.
async function main() {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const output = resolve("../.tmp/member-discovery-verification");
  mkdirSync(output, { recursive: true });
  const notebookId = "8f19609e-6e41-4b7b-bc5c-82c3b6f0792f";
  const notebookUrl = `/journal/research/${notebookId}`;
  async function dismissSetup(page: Page) {
    const close = page.getByRole("button", { name: "Close", exact: true });
    if (await close.waitFor({ timeout: 5000 }).then(() => true).catch(() => false)) await close.click();
  }
  async function login(email: string, password: string) {
    const context = await browser.newContext({ baseURL: "http://127.0.0.1:3027", viewport: { width: 1365, height: 950 } });
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Email", { exact: false }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(url => !url.pathname.includes("login"), { timeout: 60000 });
    const consent = page.getByRole("button", { name: "Essential Only" });
    if (await consent.waitFor({ timeout: 3000 }).then(() => true).catch(() => false)) await consent.click();
    return { context, page };
  }
  try {
    const member = await login("discovery-member@prismarium.local", "Prismarium-Member-2026!");
    const wallet = async () => (await (await member.context.request.get("/api/membership/wallet")).json()).wallet.availableCredits;
    const before = await wallet();
    await member.page.goto("/journal");
    await dismissSetup(member.page);
    await member.page.getByRole("button", { name: "Research", exact: true }).click();
    const notebook = member.page.locator(`a[href="${notebookUrl}"]`);
    await notebook.waitFor();
    assert.equal(await notebook.count(), 1);
    await member.page.getByLabel("Search saved research").fill("No match 8675309");
    await member.page.getByText("No saved questions match your search.").waitFor();
    await member.page.getByLabel("Search saved research").fill("Alchemy");
    await notebook.waitFor();
    await member.page.screenshot({ path: resolve(output, "journal-research-desktop.png") });
    await member.page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await member.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Journal fits mobile");
    await member.page.screenshot({ path: resolve(output, "journal-research-mobile.png"), fullPage: true });
    await notebook.click();
    await member.page.getByText("Journal research verification note", { exact: true }).waitFor();
    assert.equal(await member.page.getByRole("button", { name: "Mark reviewed" }).count(), 0);
    await member.page.goto(`/inquiries/${notebookId}`);
    await member.page.waitForURL(`**${notebookUrl}`);
    await member.page.getByText("Journal research verification note", { exact: true }).waitFor();
    assert.equal(await wallet(), before);
    console.log("Member Journal navigation, search, saved notes, mobile, and old-link redirect passed; balance unchanged.");

    const reader = await login("discovery-reader@prismarium.local", "Prismarium-Member-2026!");
    await reader.page.goto("/journal?tab=research");
    await reader.page.getByRole("heading", { name: "Saved research", exact: true }).waitFor();
    assert.equal(await reader.page.locator(`a[href="${notebookUrl}"]`).count(), 0);
    assert.equal((await reader.context.request.get(`/api/inquiries/${notebookId}`)).status(), 404);
    console.log("Another account cannot see the saved notebook.");

    const admin = await login("inquiry-admin@prismarium.local", "Prismarium-Local-2026!");
    await admin.page.goto("/journal/research/a694883b-a3e7-4947-98ac-2ba433499805");
    await admin.page.getByRole("heading", { name: "WTF is Alchemy?", exact: true }).waitFor();
    await admin.page.getByRole("button", { name: "Mark reviewed", exact: true }).first().waitFor();
    await admin.page.getByRole("link", { name: "Research", exact: true }).click();
    await admin.page.getByRole("heading", { name: "Saved research", exact: true }).waitFor();
    console.log("Admin review controls and Journal navigation passed; no findings published.");
  } finally {
    await browser.close();
  }
}
main().catch(error => {
  console.error(error instanceof Error ? error.message.split("Call log:")[0] : "Journal verification failed");
  process.exitCode = 1;
});
