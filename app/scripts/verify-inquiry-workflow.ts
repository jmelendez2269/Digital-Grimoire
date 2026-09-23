import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { inquiryLocalEnv } from "./inquiry-local-env";

async function main() {
  const env = inquiryLocalEnv();
  const APP = "http://127.0.0.1:3027";
  const output = resolve("../.tmp/inquiry-verification");
  mkdirSync(output, { recursive: true });
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const adminIds: string[] = [];
  let bookId: string | undefined;
  let correspondenceId: string | undefined;
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  const consoleErrors: string[] = [];
  const browserDiagnostics: string[] = [];
  function watchPage(page: Page) {
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning")
        browserDiagnostics.push(message.text());
    });
  }

  async function signedIn(
    role: string
  ): Promise<{ context: BrowserContext; id: string }> {
    const password = randomBytes(24).toString("hex");
    const email = `inquiry-${randomBytes(6).toString("hex")}@example.test`;
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.equal(created.error, null);
    const id = created.data.user!.id;
    adminIds.push(id);
    const profile = await db
      .from("users")
      .upsert({ id, email, role, name: "Local inquiry verification" });
    assert.equal(profile.error, null);
    const context = await browser.newContext({
      baseURL: APP,
      viewport: { width: 1440, height: 1000 },
    });
    const cookies: Array<{ name: string; value: string }> = [];
    const client = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookieOptions: {
          name: env.NEXT_PUBLIC_SUPABASE_COOKIE_NAME,
          path: "/",
          sameSite: "lax",
        },
        cookies: {
          getAll: () => cookies,
          setAll: (next) => {
            for (const cookie of next) {
              const found = cookies.find((c) => c.name === cookie.name);
              if (found) found.value = cookie.value;
              else cookies.push(cookie);
            }
          },
        },
      }
    );
    const login = await client.auth.signInWithPassword({ email, password });
    assert.equal(login.error, null);
    await context.addCookies(
      cookies.map((c) => ({
        name: c.name,
        value: c.value,
        url: APP,
        sameSite: "Lax" as const,
      }))
    );
    return { context, id };
  }
  async function dismissConsent(page: Page) {
    const button = page.getByRole("button", { name: "Essential Only" });
    if (
      await button
        .waitFor({ state: "visible", timeout: 1500 })
        .then(() => true)
        .catch(() => false)
    )
      await button.click();
  }
  async function noOverflow(page: Page) {
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true,
      "Horizontal overflow"
    );
    assert.equal(
      await page.locator("[data-nextjs-dialog]").count(),
      0,
      "Framework error overlay"
    );
  }

  try {
    const anon = await browser.newContext({ baseURL: APP });
    assert.equal((await anon.request.get("/api/inquiries")).status(), 401);
    const regular = await signedIn("user");
    assert.equal(
      (await regular.context.request.get("/api/inquiries")).status(),
      200
    );
    const admin = await signedIn("admin");
    const other = await signedIn("admin");
    const correspondence = await db
      .from("correspondences")
      .insert({
        slug: `inquiry-jesus-${Date.now()}`,
        name: "Jesus",
        category: "deity",
      })
      .select("id")
      .single();
    assert.equal(correspondence.error, null);
    correspondenceId = correspondence.data!.id;
    const book = await db
      .from("texts")
      .insert({
        title: "Inquiry verification source",
        content:
          "This is an exact passage about transformation for local verification.",
      })
      .select("id")
      .single();
    assert.equal(book.error, null);
    bookId = book.data!.id;

    const page = await admin.context.newPage();
    page.setDefaultTimeout(30000);
    watchPage(page);
    page.on("response", async (response) => {
      if (response.status() >= 400 && response.url().includes("/api/inquiries"))
        console.log(
          "Inquiry request failed:",
          response.status(),
          await response.text()
        );
    });
    await page.goto("/inquiries", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page
      .getByRole("heading", { name: "Saved research", exact: true })
      .waitFor();
    await dismissConsent(page);
    const journalSetup = page.getByRole("button", {
      name: "Close",
      exact: true,
    });
    if (await journalSetup.isVisible()) await journalSetup.click();
    await page
      .getByText("Start a research notebook manually", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "Use the Alchemy starting question" })
      .click();
    await page
      .getByRole("button", { name: "Create notebook", exact: true })
      .click();
    await page.waitForURL(/\/journal\/research\/[a-f0-9-]+/);
    await page
      .getByRole("heading", { name: "WTF is Alchemy?", exact: true })
      .waitFor();
    const inquiryId = new URL(page.url()).pathname.split("/").pop()!;
    assert.equal(
      (await other.context.request.get(`/api/inquiries/${inquiryId}`)).status(),
      404
    );
    assert.equal(
      (
        await other.context.request.post(
          `/api/inquiries/${inquiryId}/findings`,
          { data: { title: "forbidden", source_kind: "note" } }
        )
      ).status(),
      404
    );
    assert.equal(
      (
        await admin.context.request.post("/api/inquiries", {
          headers: { origin: "https://example.net" },
          data: { title: "forbidden" },
        })
      ).status(),
      403
    );
    console.log(
      "PASS: anonymous, non-admin, cross-owner, and cross-origin requests denied."
    );

    await page
      .getByRole("button", { name: "Investigate the Rosarium manuscript" })
      .click();
    await page
      .getByLabel("Finding title", { exact: true })
      .fill("Christ in the Rosarium manuscript");
    await page
      .getByLabel("Connection or claim", { exact: true })
      .fill("This manuscript depicts the Resurrection of Christ.");
    const from = page.getByRole("group", { name: "From", exact: true });
    await from
      .getByLabel("Find an existing entry or name a new one")
      .fill("Rosarium Philosophorum");
    await from.getByLabel("Entry type").selectOption("work");
    await from
      .getByRole("button", {
        name: "Create “Rosarium Philosophorum”",
        exact: true,
      })
      .click();
    await from.getByText("Selected:", { exact: false }).waitFor();
    const to = page.getByRole("group", { name: "To", exact: true });
    await to
      .getByLabel("Find an existing entry or name a new one")
      .fill("Jesus");
    await to.getByLabel("Entry type").selectOption("person");
    await to
      .getByRole("button", { name: "Use correspondence: Jesus", exact: true })
      .click();
    await to.getByText("Selected:", { exact: false }).waitFor();
    await page
      .getByLabel("Relationship", { exact: true })
      .selectOption("depicts");
    await page
      .getByLabel("Exact passage or description of the source image")
      .fill(
        "The final illustration depicts the Resurrection, with a radiant solar head."
      );
    await page
      .getByLabel("Context and limits")
      .fill(
        "MS Ferguson 210 is an eighteenth-century English copy. This observation concerns illustration 20 in this witness."
      );
    await page
      .getByLabel("My private notes and next questions")
      .fill("PRIVATE-VERIFICATION-NOTE");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByRole("heading", {
        name: "Christ in the Rosarium manuscript",
        exact: true,
      })
      .waitFor();
    let inquiryData = await (
      await admin.context.request.get(`/api/inquiries/${inquiryId}`)
    ).json();
    const findingId = inquiryData.findings[0].id;
    const draftRevision = inquiryData.findings[0].revision;
    assert.equal(
      (
        await (await anon.request.get("/api/knowledge/map")).json()
      ).findings.some((f: { id: string }) => f.id === findingId),
      false
    );
    assert.equal(
      (
        await (
          await anon.request.get("/api/knowledge/suggestions?q=Rosarium")
        ).json()
      ).items.length,
      0,
      "Draft identity leaked into search"
    );
    assert.equal(
      (
        await admin.context.request.patch(
          `/api/inquiries/${inquiryId}/findings/${findingId}`,
          { data: { action: "publish", revision: draftRevision } }
        )
      ).status(),
      400
    );
    await page
      .getByRole("checkbox", {
        name: "I checked the source, the connection, and its context.",
      })
      .check();
    await page
      .getByRole("button", { name: "Mark reviewed", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Publish connection", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Publish connection", exact: true })
      .click();
    await page
      .getByText("Connection published to the shared concept map.")
      .waitFor();
    const published = await (
      await anon.request.get("/api/knowledge/map")
    ).json();
    assert.ok(
      published.findings.some((f: { id: string }) => f.id === findingId)
    );
    assert.doesNotMatch(
      JSON.stringify(published),
      /PRIVATE-VERIFICATION-NOTE|owner_id|inquiry_id|reviewed_by/
    );
    assert.ok(
      published.entities.some(
        (e: { correspondence_id: string }) =>
          e.correspondence_id === correspondenceId
      )
    );
    assert.ok(
      (
        await (
          await anon.request.get("/api/knowledge/suggestions?q=Rosarium")
        ).json()
      ).items.some(
        (item: { name: string }) => item.name === "Rosarium Philosophorum"
      )
    );
    assert.equal(
      (
        await admin.context.request.patch(
          `/api/inquiries/${inquiryId}/findings/${findingId}`,
          { data: { action: "draft", revision: draftRevision } }
        )
      ).status(),
      409
    );
    console.log(
      "PASS: UI creates inquiry, links an existing correspondence, creates a work, reviews and publishes; public projection excludes private data; stale revision rejected."
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: resolve(output, "inquiry-desktop.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Replay discovery trail" }).click();
    assert.equal(await page.getByText("PRIVATE-VERIFICATION-NOTE").count(), 0);
    await page.screenshot({
      path: resolve(output, "episode-replay.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Exit replay" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export notes" }).click();
    const download = await downloadPromise;
    await download.saveAs(resolve(output, "episode-notes.md"));

    const publicPage = await anon.newPage();
    watchPage(publicPage);
    await publicPage.goto("/graph?type=research", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await publicPage
      .getByRole("heading", { name: "Christ in the Rosarium manuscript" })
      .waitFor();
    await dismissConsent(publicPage);
    const canvas = publicPage
      .getByRole("region", { name: "Published concept connections" })
      .locator("canvas")
      .first();
    await canvas.waitFor({ state: "visible" });
    await publicPage.getByRole("button", { name: "Use evidence list" }).click();
    await publicPage
      .getByRole("button", { name: "Show graph", exact: true })
      .click();
    await canvas.waitFor({ state: "visible" });
    await noOverflow(publicPage);
    await publicPage.screenshot({
      path: resolve(output, "shared-map-desktop.png"),
      fullPage: true,
    });
    await publicPage.setViewportSize({ width: 390, height: 844 });
    await dismissConsent(publicPage);
    await noOverflow(publicPage);
    await publicPage.screenshot({
      path: resolve(output, "shared-map-mobile.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow(page);
    console.log(
      "PASS: replay hides private notes; export downloads; published map renders for guests on desktop and mobile."
    );

    inquiryData = await (
      await admin.context.request.get(`/api/inquiries/${inquiryId}`)
    ).json();
    const endpoints = {
      source_entity_id: inquiryData.findings[0].source_entity_id,
      target_entity_id: inquiryData.findings[0].target_entity_id,
    };
    const lead = await admin.context.request.post(
      `/api/inquiries/${inquiryId}/findings`,
      {
        data: {
          title: "AI lead",
          source_kind: "ai",
          note: "Generated suggestion",
          provenance: { query: "Alchemy?", sources: [{ text_id: bookId }] },
        },
      }
    );
    assert.equal(lead.status(), 201);
    const leadFinding = (await lead.json()).finding;
    assert.equal(
      (
        await admin.context.request.patch(
          `/api/inquiries/${inquiryId}/findings/${leadFinding.id}`,
          { data: { action: "review", revision: 1, checked: true } }
        )
      ).status(),
      400
    );
    const sourceFinding = {
      title: "Quoted source",
      source_kind: "library",
      text_id: bookId,
      excerpt: "Invented quotation.",
      source_locator: "Opening paragraph",
      claim: "A test claim",
      context: "Local verification source",
      ...endpoints,
    };
    const sourceCreated = await admin.context.request.post(
      `/api/inquiries/${inquiryId}/findings`,
      { data: sourceFinding }
    );
    assert.equal(sourceCreated.status(), 201);
    const sourceId = (await sourceCreated.json()).finding.id;
    assert.equal(
      (
        await admin.context.request.patch(
          `/api/inquiries/${inquiryId}/findings/${sourceId}`,
          { data: { action: "review", revision: 1, checked: true } }
        )
      ).status(),
      400
    );
    const fixed = await admin.context.request.patch(
      `/api/inquiries/${inquiryId}/findings/${sourceId}`,
      {
        data: {
          ...sourceFinding,
          excerpt:
            "This is an exact passage about transformation for local verification.",
          revision: 1,
        },
      }
    );
    assert.equal(fixed.status(), 200);
    assert.equal(
      (
        await admin.context.request.patch(
          `/api/inquiries/${inquiryId}/findings/${sourceId}`,
          { data: { action: "review", revision: 2, checked: true } }
        )
      ).status(),
      200
    );
    const move = await admin.context.request.patch(
      `/api/inquiries/${inquiryId}/findings/${sourceId}`,
      { data: { action: "up" } }
    );
    assert.equal(move.status(), 200);
    console.log(
      "PASS: AI lead cannot be reviewed; invented quotation rejected; exact library quotation accepted; trail ordering persists."
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Unpublish and return to draft" })
      .click();
    await page
      .getByText(
        "Returned to draft. This connection is no longer on the shared map."
      )
      .waitFor();
    assert.equal(
      (
        await (await anon.request.get("/api/knowledge/map")).json()
      ).findings.some((f: { id: string }) => f.id === findingId),
      false
    );
    assert.equal(
      (
        await (
          await anon.request.get("/api/knowledge/suggestions?q=Rosarium")
        ).json()
      ).items.length,
      0,
      "Unpublished identity stayed in search"
    );
    await page.goto(`/graph?type=correspondences&focus=${correspondenceId}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await dismissConsent(page);
    await page
      .getByRole("button", { name: "Save to inquiry", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Inquiry", { exact: true }).selectOption(inquiryId);
    await dialog
      .getByLabel("What caught your attention? (optional)")
      .fill("Captured from the correspondence archive.");
    await dialog
      .getByRole("button", { name: "Save finding", exact: true })
      .click();
    await dialog.getByText("Finding saved to your inquiry.").waitFor();
    const captured = await (
      await admin.context.request.get(`/api/inquiries/${inquiryId}`)
    ).json();
    assert.ok(
      captured.findings.some(
        (f: {
          source_kind: string;
          provenance: { correspondence_id?: string };
          note: string;
        }) =>
          f.source_kind === "correspondence" &&
          f.provenance.correspondence_id === correspondenceId &&
          f.note.includes("Captured from")
      )
    );
    await page.screenshot({
      path: resolve(output, "capture-dialog.png"),
      fullPage: true,
    });
    console.log(
      "PASS: the live correspondence profile captures its identity and private note through Save to inquiry."
    );
    assert.deepEqual(consoleErrors, [], "Browser runtime errors");
    console.log(
      "PASS: unpublishing removes the shared connection. No page runtime errors."
    );
  } finally {
    writeFileSync(
      resolve(output, "browser-diagnostics.txt"),
      browserDiagnostics.join("\n\n")
    );
    for (const id of adminIds) {
      await db.from("research_inquiries").delete().eq("owner_id", id);
      await db.from("research_entities").delete().eq("created_by", id);
      await db.from("users").delete().eq("id", id);
      await db.auth.admin.deleteUser(id);
    }
    if (bookId) await db.from("texts").delete().eq("id", bookId);
    if (correspondenceId)
      await db.from("correspondences").delete().eq("id", correspondenceId);
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
