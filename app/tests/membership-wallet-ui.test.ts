import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import CreditWalletTab from "../src/components/membership/CreditWalletTab";

const wallet = {
  status: "current",
  availableCredits: 6,
  reservedCredits: 2,
  totalCredits: 8,
  grant: {
    planCode: "reader",
    grantedCredits: 10,
    validFrom: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z",
    resetsAt: "2026-09-01T00:00:00.000Z",
  },
  pending: [
    {
      actionCode: "seven_lenses.standard",
      credits: 2,
      createdAt: "2026-08-12T12:00:00.000Z",
      expiresAt: "2026-08-12T12:05:00.000Z",
    },
  ],
  history: [
    {
      kind: "credit_used",
      credits: 1,
      availableAfter: 6,
      reservedAfter: 2,
      actionCode: "working.generate",
      occurredAt: "2026-08-12T11:59:00.000Z",
    },
    {
      kind: "credit_returned",
      credits: 2,
      availableAfter: 7,
      reservedAfter: 2,
      actionCode: "seven_lenses.standard",
      occurredAt: "2026-08-12T11:58:00.000Z",
    },
  ],
  asOf: "2026-08-12T12:01:00.000Z",
};

const toolCosts = {
  version: 1,
  actions: [
    { actionCode: "working.generate", customerLabel: "The Working", creditCost: 1, enabled: false },
    { actionCode: "seven_lenses.expand", customerLabel: "Expand one lens", creditCost: 1, enabled: false },
    { actionCode: "seven_lenses.standard", customerLabel: "Standard Seven Lenses synthesis", creditCost: 2, enabled: false },
    { actionCode: "seven_lenses.long", customerLabel: "Long Seven Lenses synthesis", creditCost: 3, enabled: false },
    { actionCode: "deep_search.fresh", customerLabel: "Fresh Deep Search synthesis", creditCost: 3, enabled: false },
    { actionCode: "image.generate", customerLabel: "Image generation", creditCost: null, enabled: false },
  ],
};

test("Credits tab renders exact balance, UTC reset, reservations, committed use, and returns", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://127.0.0.1/profile?tab=credits",
  });
  const originals = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    fetch: globalThis.fetch,
  };
  const reactActEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
  });
  reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    const body = url.endsWith("/wallet") ? { wallet } : { toolCosts };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const container = dom.window.document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(createElement(CreditWalletTab));
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const text = container.textContent ?? "";
    assert.deepEqual(calls.sort(), [
      "/api/membership/tool-costs",
      "/api/membership/wallet",
    ]);
    assert.match(text, /Available6/);
    assert.match(text, /Reserved2/);
    assert.match(text, /Current total8/);
    assert.match(text, /Resets September 1, 2026.*12:00 AM UTC/);
    assert.match(text, /Standard Seven Lenses/);
    assert.match(text, /The Working completed/);
    assert.match(text, /Standard Seven Lenses returned/);
    assert.match(text, /Reading, ordinary search, Graph, Journal/);
    assert.doesNotMatch(text, /Checkout|Subscribe|Upgrade|stripe/i);
    assert.equal(container.scrollWidth <= container.clientWidth, true);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    globalThis.fetch = originals.fetch;
    Object.defineProperties(globalThis, {
      window: { value: originals.window, configurable: true },
      document: { value: originals.document, configurable: true },
      navigator: { value: originals.navigator, configurable: true },
    });
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  }
});
