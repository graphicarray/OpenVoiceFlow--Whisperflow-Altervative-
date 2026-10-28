import type { PolicyDecisionSnapshot } from "../../stores/policyRules.ts";

interface ProviderOption {
  id: string;
}

export interface OnboardingSetupAvailability {
  cloud: boolean;
  local: boolean;
  byok: boolean;
  selfHosted: boolean;
}

export function getOnboardingSetupAvailability(_args: {
  policy: PolicyDecisionSnapshot;
  agentAllowed: boolean;
  transcriptionProviders: ProviderOption[];
  llmProviders: ProviderOption[];
}): OnboardingSetupAvailability {
  return { cloud: false, local: true, byok: true, selfHosted: true };
}

export function hasAvailableOnboardingSetup(_availability: OnboardingSetupAvailability): boolean {
  return true;
}
