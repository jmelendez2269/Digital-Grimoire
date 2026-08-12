import type { SafeMembershipCatalog } from "./membership-catalog.server";

export type PricingPlan = SafeMembershipCatalog["plans"][number];
export type PricingOffer = SafeMembershipCatalog["offers"][number];

export interface PublicPricingEntry {
  plan: PricingPlan;
  offer: PricingOffer | null;
}

export function getPublicPricingEntries(
  catalog: SafeMembershipCatalog
): PublicPricingEntry[] {
  const publicOffers = catalog.offers.filter(
    (offer) => offer.publiclyAvailable && offer.acceptsNewCheckout
  );

  return catalog.plans.flatMap<PublicPricingEntry>((plan) => {
    if (!plan.publiclyAvailable) return [];
    if (plan.code === "reader") return [{ plan, offer: null }];

    const offer = publicOffers.find(
      (candidate) => candidate.planCode === plan.code
    );
    return offer ? [{ plan, offer }] : [];
  });
}
