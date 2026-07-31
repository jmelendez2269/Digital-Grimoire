import { expect, test } from "@playwright/test";

test("graph modes and thread navigation expose real state changes", async ({ page }) => {
  test.setTimeout(90_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !text.includes("ERR_NETWORK_ACCESS_DENIED")) {
      browserErrors.push(text);
    }
  });

  await page.goto("http://localhost:3000/graph");
  await page.getByRole("button", { name: "Essential Only" }).click().catch(() => undefined);
  await expect(page.getByText(/NODES:/).first()).not.toContainText("NODES: 0", { timeout: 45_000 });
  await expect(page.getByRole("tab", { name: "Focus" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: "Table" }).click();
  await expect(page.getByText("Category", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: "Table" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: "Atlas" }).click();
  await expect(page.getByRole("tab", { name: "Atlas" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/Full archive mode is active/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Reading the Archive")).toHaveCount(0);

  const mostConnected = page.getByRole("button", { name: /Explore a network hub/i });
  const discoveryCardBounds = await mostConnected.boundingBox();
  expect(discoveryCardBounds).not.toBeNull();
  expect(discoveryCardBounds!.height).toBeGreaterThanOrEqual(90);
  const mostConnectedName = (await mostConnected.locator("span").nth(1).textContent())?.trim() || "";
  await mostConnected.click();
  await expect(page.getByRole("tab", { name: "Focus" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("combobox", { name: "Search the graph" })).toHaveValue(mostConnectedName);
  await expect(page.getByText("Current Focus").locator("..")).toContainText(mostConnectedName);
  await expect(page.getByRole("status")).toContainText(mostConnectedName);
  await expect(page.getByRole("status")).toContainText(/Showing \d+ direct connections?/);

  const inspector = page.getByRole("complementary", { name: "Selected correspondence inspector" });
  await expect(inspector).toContainText(mostConnectedName);
  const showAllConnections = inspector.getByRole("button", { name: /Show all \d+ connections/ });
  await expect(showAllConnections).toBeVisible();
  const showAllLabel = (await showAllConnections.textContent()) || "";
  const visibleConnectionTotal = Number(showAllLabel.match(/Show all (\d+) connections/)?.[1]);
  expect(visibleConnectionTotal).toBeGreaterThan(12);
  expect(await inspector.locator("[data-inspector-neighbor]").count()).toBe(12);
  await expect(page.getByRole("status")).toContainText(`Showing ${visibleConnectionTotal} direct connections`);
  const graphRenderer = page.locator("[data-camera-x]");
  await expect
    .poll(async () => Number(await graphRenderer.getAttribute("data-context-node-count")))
    .toBeGreaterThan(0);
  await expect(graphRenderer).toHaveAttribute("data-interaction-mode", "locked");
  await expect
    .poll(async () => Number(await graphRenderer.getAttribute("data-hidden-node-count")))
    .toBeGreaterThan(0);
  await showAllConnections.click();
  await expect(inspector.locator("[data-inspector-neighbor]")).toHaveCount(visibleConnectionTotal);
  await inspector.getByRole("button", { name: "Show fewer" }).click();
  await expect(inspector.locator("[data-inspector-neighbor]")).toHaveCount(12);

  const search = page.getByRole("combobox", { name: "Search the graph" });
  await search.fill("moon");
  const moonSuggestion = page.getByRole("option", { name: /^Moon planetary_body$/i });
  await expect(moonSuggestion).toBeVisible();
  await moonSuggestion.click();
  await expect(inspector).toContainText("Moon");
  await expect(page.getByRole("status")).toContainText("Moon");
  await expect
    .poll(async () => Number(await graphRenderer.getAttribute("data-context-node-count")))
    .toBeGreaterThan(0);

  await search.fill("mushroom");
  await expect.poll(() => search.getAttribute("aria-expanded")).toBe("true");
  const suggestionName = "Mushroom";
  const suggestion = page.getByRole("option", { name: /^Mushroom plant_misc$/i });
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(page.getByRole("status")).toContainText(suggestionName);
  await expect(inspector).toContainText(suggestionName);
  await expect(inspector).toContainText("Connected nodes");
  const expandedInspectorBounds = await inspector.boundingBox();
  expect(expandedInspectorBounds).not.toBeNull();
  expect(expandedInspectorBounds!.width).toBeGreaterThanOrEqual(360);
  await inspector.getByRole("button", { name: "Collapse inspector" }).click();
  await expect(inspector).toHaveAttribute("data-collapsed", "true");
  await expect
    .poll(async () => (await inspector.boundingBox())?.width ?? Number.POSITIVE_INFINITY)
    .toBeLessThanOrEqual(80);
  await inspector.getByRole("button", { name: "Expand inspector" }).click();
  await expect(inspector).toHaveAttribute("data-collapsed", "false");

  await graphRenderer.scrollIntoViewIfNeeded();
  const graphBounds = await graphRenderer.boundingBox();
  expect(graphBounds).not.toBeNull();
  const selectedNodeX = Number(await graphRenderer.getAttribute("data-selected-node-viewport-x"));
  const selectedNodeY = Number(await graphRenderer.getAttribute("data-selected-node-viewport-y"));
  expect(Number.isFinite(selectedNodeX)).toBe(true);
  expect(Number.isFinite(selectedNodeY)).toBe(true);
  await page.mouse.move(
    graphBounds!.x + selectedNodeX,
    graphBounds!.y + selectedNodeY,
  );
  await expect(graphRenderer).toHaveAttribute("data-interaction-mode", "hover");
  await expect(graphRenderer).toHaveAttribute("data-hover-layout", "spread");
  await expect
    .poll(async () => Number(await graphRenderer.getAttribute("data-hidden-node-count")))
    .toBeGreaterThan(0);
  await page.mouse.move(
    graphBounds!.x + graphBounds!.width - 4,
    graphBounds!.y + graphBounds!.height - 4,
  );
  await expect(graphRenderer).toHaveAttribute("data-interaction-mode", "locked");
  await expect(graphRenderer).toHaveAttribute("data-hover-layout", "restored");
  await page.mouse.move(
    graphBounds!.x + selectedNodeX,
    graphBounds!.y + selectedNodeY,
  );
  await page.mouse.click(
    graphBounds!.x + selectedNodeX,
    graphBounds!.y + selectedNodeY,
  );
  const detailsDialog = page.getByRole("dialog", { name: `${suggestionName} details` });
  await expect(detailsDialog).toBeVisible();
  await expect(detailsDialog.getByText("Graph Connections")).toBeVisible({ timeout: 20_000 });
  await detailsDialog.getByRole("button", { name: "Close" }).click();
  await expect(graphRenderer).toHaveAttribute("data-interaction-mode", "locked");
  await expect(page.getByRole("status")).toContainText("Locked node");

  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("status")).not.toContainText(suggestionName);
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("status")).toContainText(suggestionName);

  await search.fill("moonstone");
  const moonstoneSuggestion = page.getByRole("option", { name: /^Moonstone stone$/i });
  await expect(moonstoneSuggestion).toBeVisible();
  await moonstoneSuggestion.click();
  await inspector.getByRole("button", { name: "Open full details" }).click();
  const moonstoneDialog = page.getByRole("dialog", { name: "Moonstone details" });
  const libraChip = moonstoneDialog.getByRole("button", { name: "Open Libra correspondence" });
  await expect(libraChip).toBeVisible({ timeout: 20_000 });
  await libraChip.click();
  const libraDialog = page.getByRole("dialog", { name: "Libra details" });
  await expect(libraDialog).toBeVisible();
  await expect(libraDialog.getByText("Graph Connections")).toBeVisible({ timeout: 20_000 });
  await libraDialog.getByRole("button", { name: "Close" }).click();

  const graphCamera = page.locator("[data-camera-x]");
  const initialCameraX = await graphCamera.getAttribute("data-camera-x");
  await page.getByRole("button", { name: "Pan right" }).click();
  await expect.poll(() => graphCamera.getAttribute("data-camera-x")).not.toBe(initialCameraX);

  const cameraBeforeDrag = await graphCamera.getAttribute("data-camera-x");
  const panBounds = await graphCamera.boundingBox();
  expect(panBounds).not.toBeNull();
  await page.mouse.move(panBounds!.x + panBounds!.width * 0.65, panBounds!.y + panBounds!.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(panBounds!.x + panBounds!.width * 0.45, panBounds!.y + panBounds!.height * 0.45, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => graphCamera.getAttribute("data-camera-x")).not.toBe(cameraBeforeDrag);

  const cameraBeforeHorizontalWheel = await graphCamera.getAttribute("data-camera-x");
  await page.mouse.move(panBounds!.x + panBounds!.width * 0.5, panBounds!.y + panBounds!.height * 0.45);
  await page.mouse.wheel(120, 0);
  await expect.poll(() => graphCamera.getAttribute("data-camera-x")).not.toBe(cameraBeforeHorizontalWheel);

  await page.getByRole("button", { name: /Random starting point/i }).click();
  await expect(page.getByRole("combobox", { name: "Search the graph" })).toHaveValue("");
  await expect(page.getByText("Random Discovery")).toBeVisible();
  await expect(graphRenderer).toHaveAttribute("data-interaction-mode", "locked");
  await page.keyboard.press("Escape");
  await expect(graphRenderer).toHaveAttribute("data-interaction-mode", "rest");
  await expect(page.getByText("Right-drag / Rotate")).toBeAttached();
  await expect(page.getByText("Click / Open details")).toBeAttached();
  expect(browserErrors).toEqual([]);
});
