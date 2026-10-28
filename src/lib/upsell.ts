export type UpsellDecision = "show" | "hide" | "pending";
export type ProPlanCardCta =
  | "currentPlan"
  | "downgradeToPro"
  | "signUp"
  | "coveredByWorkspace"
  | "checkout"
  | "none";

export function decideUpsell(_input?: unknown): UpsellDecision {
  return "hide";
}

export function decideProPlanCardCta(_input?: unknown): ProPlanCardCta {
  return "none";
}

export function storeSubscriptionsUrl(_store?: string | null): string | null {
  return null;
}
