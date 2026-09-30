import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { inquiryLocalEnv } from "./inquiry-local-env";

// Dedicated local fixtures only. Real provider calls are used unless --run is
// supplied; research and drafts are retained for inspection, never published.
async function main() {
  const env = inquiryLocalEnv();
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const output = resolve("../.tmp/member-discovery-verification");
  mkdirSync(output, { recursive: true });
  async function login(email: string) {
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3027",
      viewport: { width: 1365, height: 950 },
    });
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Email", { exact: false }).fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("Prismarium-Member-2026!");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("login"), {
      timeout: 60000,
    });
    await page.goto("/search");
    await page
      .getByLabel("What are you curious about?")
      .waitFor({ timeout: 60000 });
    const consent = page.getByRole("button", { name: "Essential Only" });
    if (
      await consent
        .waitFor({ timeout: 2000 })
        .then(() => true)
        .catch(() => false)
    )
      await consent.click();
    return { context, page };
  }
  async function wallet(context: BrowserContext) {
    const response = await context.request.get("/api/membership/wallet");
    assert.equal(response.status(), 200, await response.text());
    return (await response.json()).wallet;
  }
  async function generate(
    page: Page,
    context: BrowserContext,
    question: string,
    parent?: string
  ) {
    const start = (await wallet(context)).availableCredits;
    if (parent)
      await page.getByLabel("Have a hunch or another question?").fill(question);
    else await page.getByLabel("What are you curious about?").fill(question);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/knowledge/discover") &&
        r.request().method() === "POST"
    );
    await page
      .getByRole("button", {
        name: parent
          ? "Investigate this connection · 3 Prism Credits"
          : "Explore this question · 3 Prism Credits",
        exact: true,
      })
      .click();
    const request = (await response).request().postDataJSON();
    await page.waitForFunction(
      (previous) => {
        const id = new URL(location.href).searchParams.get("discovery");
        return (
          (id && id !== previous) ||
          Array.from(document.querySelectorAll('[role="alert"]')).some(
            (el) =>
              el.textContent?.includes("Research could not finish") ||
              el.textContent?.includes("credit record needs checking")
          )
        );
      },
      parent || null,
      { timeout: 300000 }
    );
    const id = new URL(page.url()).searchParams.get("discovery");
    assert.equal(
      id,
      request.id,
      await page
        .locator('[role="alert"]')
        .allTextContents()
        .then((s) => s.join(" "))
    );
    const stored = await context.request.get(
      `/api/knowledge/discover?id=${id}`
    );
    const run = (await stored.json()).run;
    assert.equal(run.status, "complete");
    assert.ok(run.result.connections.length > 0);
    assert.equal((await wallet(context)).availableCredits, start - 3);
    const duplicate = await context.request.post("/api/knowledge/discover", {
      data: request,
    });
    assert.equal(duplicate.status(), 200);
    assert.equal((await duplicate.json()).run.id, id);
    assert.equal(
      (await wallet(context)).availableCredits,
      start - 3,
      "Duplicate request is free"
    );
    const events = await db
      .from("credit_reservations")
      .select("state,quoted_credits")
      .eq("user_id", run.owner_id)
      .eq("request_id", id);
    assert.equal(events.error, null);
    assert.deepEqual(events.data, [{ state: "committed", quoted_credits: 3 }]);
    writeFileSync(resolve(output, `${id}.json`), JSON.stringify(run, null, 2));
    console.log(
      JSON.stringify({
        phase: parent ? "followup" : "root",
        id,
        before: start,
        after: start - 3,
      })
    );
    return run;
  }
  try {
    const member = await login("discovery-member@prismarium.local");
    const reader = await login("discovery-reader@prismarium.local");
    // Warm the relevant routes before a streaming generation starts in dev.
    await member.page.goto("/inquiries");
    await member.page
      .getByRole("heading", { name: "Saved research", exact: true })
      .waitFor();
    assert.equal(new URL(member.page.url()).pathname, "/journal");
    assert.equal(
      new URL(member.page.url()).searchParams.get("tab"),
      "research"
    );
    const setupClose = member.page.getByRole("button", {
      name: "Close",
      exact: true,
    });
    if (await setupClose.isVisible()) await setupClose.click();
    await member.page.goto("/seven-lenses");
    await member.page.locator("#query").fill("How do symbols acquire meaning?");
    await member.page
      .getByText("Investigate sources and discover deeper connections", {
        exact: true,
      })
      .click();
    assert.equal(
      await member.page.getByLabel("What are you curious about?").inputValue(),
      "How do symbols acquire meaning?"
    );
    await member.page.goto("/search");
    const existing = process.argv
      .find((arg) => arg.startsWith("--run="))
      ?.slice(6);
    let run;
    if (existing) {
      await member.page.goto(`/search?discovery=${existing}`);
      run = (
        await (
          await member.context.request.get(
            `/api/knowledge/discover?id=${existing}`
          )
        ).json()
      ).run;
    } else {
      run = await generate(member.page, member.context, "WTF is Alchemy?");
      run = await generate(
        member.page,
        member.context,
        "I've heard Jesus mentioned in relation to alchemy. Can you investigate that?",
        run.id
      );
    }
    const beforeFree = (await wallet(member.context)).availableCredits;
    await member.page
      .getByRole("button", { name: "Save to Journal", exact: true })
      .first()
      .click();
    const saved = member.page
      .getByRole("link", { name: "Saved · Open in Journal" })
      .first();
    await saved.waitFor();
    const inquiryUrl = (await saved.getAttribute("href"))!;
    assert.match(inquiryUrl, /^\/journal\/research\/[a-f0-9-]+$/);
    const inquiryApi = `/api/inquiries/${inquiryUrl.split("/").pop()}`;
    const inquiryResponse = await member.context.request.get(inquiryApi);
    const inquiry = await inquiryResponse.json();
    assert.ok(
      inquiry.findings.every((f: { status: string }) => f.status === "draft")
    );
    const finding = inquiry.findings.find(
      (f: { discovery_id: string }) => f.discovery_id === run.id
    );
    const patch = await member.context.request.patch(inquiryApi, {
      data: {
        title: inquiry.inquiry.title,
        question: inquiry.inquiry.question,
        notes: "Private member verification note",
        revision: inquiry.inquiry.revision,
      },
    });
    assert.equal(patch.status(), 200);
    for (const action of ["review", "publish"]) {
      const forbidden = await member.context.request.patch(
        `${inquiryApi}/findings/${finding.id}`,
        { data: { action, revision: finding.revision, checked: true } }
      );
      assert.equal(forbidden.status(), 403);
    }
    await member.page.goto(inquiryUrl);
    await member.page
      .getByText("Private member verification note", { exact: true })
      .waitFor();
    await member.page
      .getByRole("button", { name: "Edit research notes", exact: true })
      .click();
    await member.page
      .getByLabel("Private research notes", { exact: true })
      .fill("Journal research verification note");
    const noteSave = member.page.waitForResponse((response) =>
      new URL(response.url()).pathname === inquiryApi && response.request().method() === "PATCH"
    );
    await member.page
      .getByRole("button", { name: "Save research notes", exact: true })
      .click();
    const noteResponse = await noteSave;
    assert.equal(noteResponse.status(), 200, await noteResponse.text());
    await member.page.getByText("Research notes saved in your Journal.", { exact: true }).waitFor();
    await member.page
      .getByText("Journal research verification note", { exact: true })
      .waitFor();
    await member.page.reload();
    await member.page
      .getByText("Journal research verification note", { exact: true })
      .waitFor();
    console.log("Journal notebook note saved and reloaded.");
    assert.equal(
      await member.page.getByRole("button", { name: "Mark reviewed" }).count(),
      0
    );
    assert.equal(
      await member.page
        .getByRole("button", { name: "Publish connection", exact: true })
        .count(),
      0
    );
    assert.equal((await wallet(member.context)).availableCredits, beforeFree);
    assert.equal((await reader.context.request.get(inquiryApi)).status(), 404);
    assert.equal(
      (
        await reader.context.request.get(`/api/knowledge/discover?id=${run.id}`)
      ).status(),
      404
    );
    assert.equal(
      (
        await reader.context.request.post(
          `/api/knowledge/discover/${run.id}/save`,
          { data: { index: 0 } }
        )
      ).status(),
      404
    );
    const ownEntities = (
      await (await reader.context.request.get("/api/knowledge/entities")).json()
    ).entities;
    assert.ok(
      !ownEntities.some((e: { id: string }) =>
        inquiry.entities.some(
          (privateEntry: { id: string }) => privateEntry.id === e.id
        )
      )
    );
    const readerInquiry = await reader.context.request.post("/api/inquiries", {
      data: { title: "Local private ownership check" },
    });
    assert.equal(readerInquiry.status(), 201);
    const readerInquiryId = (await readerInquiry.json()).inquiry.id;
    const forgedEntry = await reader.context.request.post(
      `/api/inquiries/${readerInquiryId}/findings`,
      {
        data: {
          title: "Must reject another user's entry",
          source_kind: "note",
          source_entity_id: finding.source_entity_id,
        },
      }
    );
    assert.equal(forgedEntry.status(), 403);
    const forbiddenParent = await reader.context.request.post(
      "/api/knowledge/discover",
      {
        data: {
          id: crypto.randomUUID(),
          question: "Explore this",
          parentId: run.id,
        },
      }
    );
    assert.equal(forbiddenParent.status(), 404);
    const unpaid = await reader.context.request.post(
      "/api/knowledge/discover",
      { data: { id: crypto.randomUUID(), question: "What is alchemy?" } }
    );
    assert.match(await unpaid.text(), /METERING_PAID_MEMBERSHIP_REQUIRED/);
    assert.equal(
      (
        await member.context.request.post("/api/parallax/ai-search", {
          data: { query: "alchemy" },
        })
      ).status(),
      410
    );
    const publicMap = await reader.context.request.get("/api/knowledge/map");
    assert.ok(!(await publicMap.text()).includes(finding.id));
    await member.page.goto(`/search?discovery=${run.id}`);
    await member.page
      .getByRole("heading", { name: "Connections worth following" })
      .waitFor();
    await member.page.screenshot({
      path: resolve(output, "member-desktop.png"),
      fullPage: false,
    });
    await member.page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await member.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    );
    await member.page.screenshot({
      path: resolve(output, "member-mobile.png"),
      fullPage: true,
    });
    // Removing paid access must not remove saved research or the ability to save.
    const hold = await db
      .from("billing_memberships")
      .update({ billing_hold: true })
      .eq("user_id", run.owner_id);
    assert.equal(hold.error, null);
    try {
      assert.equal(
        (
          await member.context.request.get(
            `/api/knowledge/discover?id=${run.id}`
          )
        ).status(),
        200
      );
      assert.equal(
        (
          await member.context.request.post(
            `/api/knowledge/discover/${run.id}/save`,
            { data: { index: 0 } }
          )
        ).status(),
        200
      );
      assert.equal(
        (await member.context.request.get(inquiryApi)).status(),
        200
      );
    } finally {
      const restored = await db
        .from("billing_memberships")
        .update({ billing_hold: false })
        .eq("user_id", run.owner_id);
      assert.equal(restored.error, null);
    }
    assert.equal((await wallet(member.context)).availableCredits, beforeFree);
    await member.page.setViewportSize({ width: 1365, height: 950 });
    await member.page.goto("/journal");
    const closeJournalSetup = member.page.getByRole("button", {
      name: "Close",
      exact: true,
    });
    if (await closeJournalSetup.waitFor({ timeout: 5000 }).then(() => true).catch(() => false)) await closeJournalSetup.click();
    await member.page
      .getByRole("button", { name: "Research", exact: true })
      .click();
    const notebook = member.page.locator(`a[href="${inquiryUrl}"]`);
    await notebook.waitFor();
    assert.equal(
      await notebook.count(),
      1,
      "One notebook per starting question"
    );
    await member.page
      .getByLabel("Search saved research")
      .fill("No matching local research 8675309");
    await member.page
      .getByText("No saved questions match your search.")
      .waitFor();
    await member.page.getByLabel("Search saved research").fill("Alchemy");
    await notebook.waitFor();
    await member.page.screenshot({
      path: resolve(output, "journal-research-desktop.png"),
    });
    await member.page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await member.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    );
    await member.page.screenshot({
      path: resolve(output, "journal-research-mobile.png"),
      fullPage: true,
    });
    await notebook.click();
    await member.page
      .getByText("Journal research verification note", { exact: true })
      .waitFor();
    await member.page.goto(`/inquiries/${inquiry.inquiry.id}`);
    await member.page.waitForURL(`**${inquiryUrl}`);
    await member.page
      .getByText("Journal research verification note", { exact: true })
      .waitFor();
    await reader.page.goto("/journal?tab=research");
    await reader.page
      .getByRole("heading", { name: "Saved research", exact: true })
      .waitFor();
    assert.equal(
      await reader.page.locator(`a[href="${inquiryUrl}"]`).count(),
      0
    );
    assert.equal((await wallet(member.context)).availableCredits, beforeFree);
    console.log(
      JSON.stringify({
        verified: true,
        run: run.id,
        inquiryUrl,
        balance: beforeFree,
        checks: [
          "3-credit root and follow-up",
          "free duplicate/read/save/notes",
          "member publication blocked",
          "cross-account isolation",
          "saved work survives billing hold",
          "Seven Lenses handoff",
          "mobile layout",
          "Journal research save, search, notes, reload, and old-link redirects",
        ],
      })
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
