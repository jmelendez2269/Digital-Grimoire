import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import SubscriptionTab from "../src/components/SubscriptionTab";

const foundingCancellation = {
  planCode: "student",
  planName: "Student",
  stripeStatus: "active",
  pricingCohort: "founding",
  offerCode: "student_founding_monthly",
  billingInterval: "month",
  amountCents: 1500,
  currency: "usd",
  currentPeriodStart: "2026-08-01T00:00:00.000Z",
  currentPeriodEnd: "2026-09-01T00:00:00.000Z",
  cancelAtPeriodEnd: true,
  accessUntil: "2026-09-01T00:00:00.000Z",
  paidEntitlementsActive: true,
  billingHold: false,
  portalAvailable: false,
  reconcileAvailable: false,
};

test("account billing component renders exact safe founding cancellation state", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://127.0.0.1/profile?tab=subscription",
  });
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalNavigator = globalThis.navigator;
  const originalFetch = globalThis.fetch;
  const reactActEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };

  Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
  });
  reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.fetch = async (input) => {
    assert.equal(input, "/api/membership/billing-summary");
    return new Response(JSON.stringify({ billing: foundingCancellation }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const container = dom.window.document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(createElement(SubscriptionTab));
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const text = container.textContent ?? "";
    assert.match(text, /Current planStudent/);
    assert.match(text, /\$15\/month/);
    assert.match(text, /Founding rate/);
    assert.match(text, /Active/);
    assert.match(text, /Scheduled to end onSeptember 1, 2026/);
    assert.match(text, /Cancellation is scheduled/);
    assert.match(text, /Billing operations are safely closed/);
    assert.doesNotMatch(text, /Checkout|Subscribe|Upgrade/);
    assert.equal(container.scrollWidth <= container.clientWidth, true);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    globalThis.fetch = originalFetch;
    Object.defineProperties(globalThis, {
      window: { value: originalWindow, configurable: true },
      document: { value: originalDocument, configurable: true },
      navigator: { value: originalNavigator, configurable: true },
    });
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  }
});
