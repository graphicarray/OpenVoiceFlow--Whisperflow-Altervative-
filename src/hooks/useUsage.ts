import type { StoreBilling, UsageState } from "../lib/usageStore";

export interface UseUsageResult {
  status: UsageState["status"];
  isRefreshing: boolean;
  isRetrying: boolean;
  error: string | null;
  retry: () => Promise<void>;
  refetch: () => Promise<void>;
  hasPaidAccess: boolean | null;
  hasPaidAccessOptimistic: boolean;
  plan: string;
  isPastDue: boolean;
  wordsUsed: number;
  wordsRemaining: number;
  limit: number;
  isSubscribed: boolean;
  isPersonallySubscribed: boolean;
  storeBilling: StoreBilling | null;
  entitledWorkspaceIds: string[];
  isTrial: boolean;
  trialDaysLeft: number | null;
  currentPeriodEnd: string | null;
  billingInterval: "monthly" | "annual" | null;
  isOverLimit: boolean;
  isApproachingLimit: boolean;
  resetAt: string | null;
  checkoutLoading: boolean;
  openCheckout: (opts?: {
    plan?: "monthly" | "annual";
    tier?: "pro" | "business";
  }) => Promise<{ success: boolean; error?: string }>;
  openBillingPortal: () => Promise<{ success: boolean; error?: string; code?: string }>;
  switchPlan: (opts: {
    plan: "monthly" | "annual";
    tier: "pro" | "business";
  }) => Promise<{ success: boolean; alreadyOnPlan?: boolean; error?: string }>;
  previewSwitchPlan: (opts: { plan: "monthly" | "annual"; tier: "pro" | "business" }) => Promise<{
    success: boolean;
    immediateAmount?: number;
    currency?: string;
    currentPriceAmount?: number;
    currentInterval?: string;
    newPriceAmount?: number;
    newInterval?: string;
    nextBillingDate?: string | null;
    alreadyOnPlan?: boolean;
    error?: string;
  }>;
}

const SUBSCRIPTION_FREE_USAGE: UseUsageResult = {
  status: "success",
  isRefreshing: false,
  isRetrying: false,
  error: null,
  retry: async () => {},
  refetch: async () => {},
  hasPaidAccess: true,
  hasPaidAccessOptimistic: true,
  plan: "pro",
  isPastDue: false,
  wordsUsed: 0,
  wordsRemaining: 999999999,
  limit: 0,
  isSubscribed: true,
  isPersonallySubscribed: true,
  storeBilling: null,
  entitledWorkspaceIds: [],
  isTrial: false,
  trialDaysLeft: null,
  currentPeriodEnd: null,
  billingInterval: null,
  isOverLimit: false,
  isApproachingLimit: false,
  resetAt: null,
  checkoutLoading: false,
  openCheckout: async () => ({ success: false }),
  openBillingPortal: async () => ({ success: false }),
  switchPlan: async () => ({ success: false }),
  previewSwitchPlan: async () => ({ success: false }),
};

export function useUsage(): UseUsageResult | null {
  return SUBSCRIPTION_FREE_USAGE;
}
