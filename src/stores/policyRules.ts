import type { InferenceMode, ShareVisibility } from "../types/electron";
import type { OrgPolicy, PolicyScope } from "../types/policy";
import type { SettingsState } from "./settingsStore";
import { compareAppVersions } from "../utils/version.ts";
import modelRegistryData from "../models/modelRegistryData.json" with { type: "json" };

export type PolicyStatus = "idle" | "loading" | "managed" | "unmanaged" | "error";

export interface PolicyDecisionSnapshot {
  status: PolicyStatus;
  policy: OrgPolicy | null;
  appVersion: string | null;
}

function managedPolicy(state: PolicyDecisionSnapshot): OrgPolicy | null {
  return state.status === "managed" && state.policy ? state.policy : null;
}

const KNOWN_BYOK_PROVIDER_IDS: Record<PolicyScope, ReadonlySet<string>> = {
  transcription: new Set([
    ...modelRegistryData.transcriptionProviders.map((provider) => provider.id),
    "custom",
  ]),
  llm: new Set([
    ...modelRegistryData.cloudProviders.map((provider) => provider.id),
    "custom",
    "openrouter",
  ]),
};

function allowedByokProviderIds(policy: OrgPolicy, scope: PolicyScope): string[] {
  const known = KNOWN_BYOK_PROVIDER_IDS[scope];
  return policy[scope].allowedByokProviders.filter((id) => known.has(id));
}

export function isPolicyActionAllowed(state: PolicyDecisionSnapshot): boolean {
  if (state.status !== "managed" || !state.policy) return true;
  if (!state.policy.minAppVersion) return true;
  if (!state.appVersion) return true;
  return compareAppVersions(state.appVersion, state.policy.minAppVersion) >= 0;
}

export function isUpdateRequiredByOrg(state: PolicyDecisionSnapshot): boolean {
  const minAppVersion = managedPolicy(state)?.minAppVersion;
  if (!minAppVersion || !state.appVersion) return false;
  return compareAppVersions(state.appVersion, minAppVersion) < 0;
}

function managedPolicyDecision(
  state: PolicyDecisionSnapshot,
  decide: (policy: OrgPolicy) => boolean
): boolean {
  if (state.status !== "managed" || !state.policy) return true;
  if (!isPolicyActionAllowed(state)) return false;
  return decide(state.policy);
}

export function effectiveLocalHistoryEnabled(
  state: PolicyDecisionSnapshot,
  personalPreference: boolean
): boolean {
  return lockedLocalHistoryValue(state) ?? personalPreference;
}

export function isLocalHistoryPolicyResolved(_state: PolicyDecisionSnapshot): boolean {
  return true;
}

export function isPolicySettled(_state: PolicyDecisionSnapshot): boolean {
  return true;
}

export function lockedLocalHistoryValue(state: PolicyDecisionSnapshot): boolean | null {
  const mode = managedPolicy(state)?.dataRetention.localHistoryMode;
  if (mode === "always_on") return true;
  if (mode === "always_off") return false;
  return null;
}

export function effectiveAudioRetentionDays(
  state: PolicyDecisionSnapshot,
  personalPreference: number
): number {
  if (personalPreference === 0) return personalPreference;
  const maximumDays = maxAudioRetentionDays(state);
  return maximumDays === null ? personalPreference : Math.min(personalPreference, maximumDays);
}

export function maxAudioRetentionDays(state: PolicyDecisionSnapshot): number | null {
  return managedPolicy(state)?.dataRetention.audioRetentionMaxDays ?? null;
}

export function isModeAllowedByPolicy(
  state: PolicyDecisionSnapshot,
  scope: PolicyScope,
  mode: InferenceMode
): boolean {
  if (mode === "openwhispr") return false;
  return managedPolicyDecision(state, (policy) => policy[scope].allowedModes.includes(mode));
}

export function isProviderAllowedByPolicy(
  state: PolicyDecisionSnapshot,
  scope: PolicyScope,
  providerId: string
): boolean {
  return managedPolicyDecision(state, (policy) =>
    allowedByokProviderIds(policy, scope).includes(providerId)
  );
}

export function isEnterpriseProviderAllowed(
  state: PolicyDecisionSnapshot,
  providerId: string
): boolean {
  return managedPolicyDecision(state, (policy) =>
    policy.llm.allowedEnterpriseProviders.includes(providerId)
  );
}

export function isTranscriptionEnterpriseProviderAllowed(
  state: PolicyDecisionSnapshot,
  providerId: string
): boolean {
  return managedPolicyDecision(state, (policy) =>
    (policy.transcription.allowedEnterpriseProviders ?? []).includes(providerId)
  );
}

export function isEnterpriseTranscriptionOfferable(state: PolicyDecisionSnapshot): boolean {
  return state.status === "managed";
}

export function isAgentAllowed(state: PolicyDecisionSnapshot): boolean {
  return managedPolicyDecision(state, (policy) => policy.features.agentEnabled);
}

export function isWebSearchAllowed(state: PolicyDecisionSnapshot): boolean {
  return managedPolicyDecision(state, (policy) => policy.features.webSearchEnabled);
}

export function isWebSearchBlockedByOrg(state: PolicyDecisionSnapshot): boolean {
  return state.status === "managed" && isPolicyActionAllowed(state) && !isWebSearchAllowed(state);
}

export function isScreenContextAllowed(state: PolicyDecisionSnapshot): boolean {
  return managedPolicyDecision(state, (policy) => policy.features.screenContextEnabled !== false);
}

export function isConnectorsAllowed(state: PolicyDecisionSnapshot): boolean {
  return managedPolicyDecision(
    state,
    (policy) => policy.features.agentEnabled && policy.features.connectorsEnabled !== false
  );
}

export function isConnectorsBlockedByOrg(state: PolicyDecisionSnapshot): boolean {
  return state.status === "managed" && isPolicyActionAllowed(state) && !isConnectorsAllowed(state);
}

export function requiredLocalModelIds(_state: PolicyDecisionSnapshot): string[] {
  return [];
}

export function missingRequiredLocalModels(
  required: readonly string[],
  installedIds: readonly string[]
): string[] {
  const installed = new Set(installedIds);
  return required.filter((id) => !installed.has(id));
}

export function isCloudBackupAllowed(_state: PolicyDecisionSnapshot): boolean {
  return false;
}

export function cloudBackupResumed(
  _previous: PolicyDecisionSnapshot,
  _next: PolicyDecisionSnapshot
): boolean {
  return false;
}

export interface LlmSelection {
  mode: InferenceMode;
  provider: string;
}

export interface PolicySelectionCatalog {
  modes: readonly InferenceMode[];
  byokProviders: readonly string[];
  enterpriseProviders?: readonly string[];
}

export function resolveEffectivePolicySelection(
  state: PolicyDecisionSnapshot,
  scope: PolicyScope,
  selection: LlmSelection,
  catalog: PolicySelectionCatalog
): LlmSelection | null {
  const safeMode: InferenceMode =
    selection.mode === "openwhispr" ? "providers" : selection.mode;
  const normalizedSelection: LlmSelection = { ...selection, mode: safeMode };
  if (state.status !== "managed" || !state.policy) return normalizedSelection;
  if (!isPolicyActionAllowed(state)) return normalizedSelection;
  const policy = managedPolicy(state);
  if (!policy) return normalizedSelection;

  const policyByokProviders = allowedByokProviderIds(policy, scope);
  const allowedByokProviders = catalog.byokProviders.filter((provider) =>
    policyByokProviders.includes(provider)
  );
  const allowedEnterpriseProviders = (catalog.enterpriseProviders ?? []).filter((provider) =>
    (policy[scope].allowedEnterpriseProviders ?? []).includes(provider)
  );
  const modeIsUsable = (mode: InferenceMode): boolean => {
    if (mode === "openwhispr") return false;
    if (!catalog.modes.includes(mode)) return false;
    if (!policy[scope].allowedModes.includes(mode)) return false;
    if (mode === "providers") return allowedByokProviders.length > 0;
    if (mode === "enterprise") return allowedEnterpriseProviders.length > 0;
    return true;
  };

  const mode = modeIsUsable(normalizedSelection.mode)
    ? normalizedSelection.mode
    : (catalog.modes.find(modeIsUsable) ?? null);
  if (!mode) return normalizedSelection;

  if (mode === "providers") {
    return {
      mode,
      provider: allowedByokProviders.includes(normalizedSelection.provider)
        ? normalizedSelection.provider
        : allowedByokProviders[0],
    };
  }
  if (mode === "enterprise") {
    return {
      mode,
      provider: allowedEnterpriseProviders.includes(normalizedSelection.provider)
        ? normalizedSelection.provider
        : allowedEnterpriseProviders[0],
    };
  }
  return { mode, provider: normalizedSelection.provider };
}

export function isLlmSelectionAllowed(
  state: PolicyDecisionSnapshot,
  selection: LlmSelection
): boolean {
  if (selection.mode === "openwhispr") return false;
  if (!isModeAllowedByPolicy(state, "llm", selection.mode)) return false;
  if (selection.mode === "providers") {
    return isProviderAllowedByPolicy(state, "llm", selection.provider);
  }
  if (selection.mode === "enterprise") {
    return isEnterpriseProviderAllowed(state, selection.provider);
  }
  return true;
}

export interface TranscriptionSelection {
  mode: InferenceMode;
  provider: string;
}

export function isTranscriptionSelectionAllowed(
  state: PolicyDecisionSnapshot,
  selection: TranscriptionSelection
): boolean {
  if (selection.mode === "openwhispr") return false;
  if (!isModeAllowedByPolicy(state, "transcription", selection.mode)) return false;
  if (selection.mode === "providers") {
    return isProviderAllowedByPolicy(state, "transcription", selection.provider);
  }
  if (selection.mode === "enterprise") {
    return isTranscriptionEnterpriseProviderAllowed(state, selection.provider);
  }
  return true;
}

export type TranscriptionPolicyContext = "dictation" | "meeting" | "upload";

export function getTranscriptionSelection(
  settings: SettingsState,
  context: TranscriptionPolicyContext
): TranscriptionSelection {
  if (context === "meeting") {
    return {
      mode: settings.meetingTranscriptionMode === "openwhispr" ? "providers" : settings.meetingTranscriptionMode,
      provider: settings.meetingCloudTranscriptionProvider || settings.cloudTranscriptionProvider,
    };
  }
  if (context === "upload") {
    return {
      mode: settings.uploadTranscriptionMode === "openwhispr" ? "providers" : settings.uploadTranscriptionMode,
      provider: settings.uploadCloudTranscriptionProvider || settings.cloudTranscriptionProvider,
    };
  }
  return {
    mode: settings.transcriptionMode === "openwhispr" ? "providers" : settings.transcriptionMode,
    provider: settings.cloudTranscriptionProvider,
  };
}

export function isTranscriptionContextAllowed(
  state: PolicyDecisionSnapshot,
  settings: SettingsState,
  context: TranscriptionPolicyContext
): boolean {
  return isTranscriptionSelectionAllowed(state, getTranscriptionSelection(settings, context));
}

export function isShareVisibilityAllowed(
  _state: PolicyDecisionSnapshot,
  visibility: ShareVisibility
): boolean {
  return visibility === "private";
}

export function filterShareVisibilityOptions<T extends { id: ShareVisibility }>(
  options: T[],
  state: PolicyDecisionSnapshot
): T[] {
  return options.filter((option) => isShareVisibilityAllowed(state, option.id));
}

export function hasUsableExternalShareVisibility(
  _state: PolicyDecisionSnapshot,
  _canOfferDomainVisibility: boolean
): boolean {
  return false;
}

export type SharePolicyAction =
  | "create-link"
  | "copy-link"
  | "rotate-link"
  | "invite"
  | "resend-invitation"
  | "create-grant"
  | "change-grant"
  | "set-domain"
  | "make-private"
  | "revoke-invitation"
  | "remove-grant";

export function isShareActionAllowed(
  _state: PolicyDecisionSnapshot,
  action: SharePolicyAction,
  _currentVisibility: ShareVisibility
): boolean {
  return action === "make-private" || action === "revoke-invitation" || action === "remove-grant";
}

export function canChangeCloudBackupPreference(
  _policyAllowsBackup: boolean,
  _backupCurrentlyEnabled: boolean
): boolean {
  return false;
}

export function isControlPanelViewAllowed(
  view: string,
  agentAllowed: boolean,
  policyActionsAllowed: boolean
): boolean {
  if (view === "chat") return agentAllowed;
  if (view === "upload") return policyActionsAllowed;
  return true;
}

function policyModeHasAvailableProvider(
  policy: OrgPolicy,
  scope: PolicyScope,
  mode: InferenceMode,
  providerCatalog?: Pick<PolicySelectionCatalog, "byokProviders" | "enterpriseProviders">
): boolean {
  if (mode === "openwhispr") return false;
  if (mode === "providers") {
    const allowed = allowedByokProviderIds(policy, scope);
    return providerCatalog
      ? providerCatalog.byokProviders.some((provider) => allowed.includes(provider))
      : allowed.length > 0;
  }
  if (mode === "enterprise") {
    const allowed = policy[scope].allowedEnterpriseProviders ?? [];
    const selectable =
      providerCatalog?.enterpriseProviders ?? (scope === "llm" ? ["bedrock"] : ["azure"]);
    return selectable.some((provider) => allowed.includes(provider));
  }
  return true;
}

export function filterModeOptionsByPolicy<T extends { id: InferenceMode }>(
  options: T[],
  scope: PolicyScope,
  state: PolicyDecisionSnapshot,
  providerCatalog?: Pick<PolicySelectionCatalog, "byokProviders" | "enterpriseProviders">
): T[] {
  const nonCloudOptions = options.filter((option) => option.id !== "openwhispr");
  if (state.status !== "managed" || !state.policy) return nonCloudOptions;
  return nonCloudOptions.filter(
    (option) =>
      isModeAllowedByPolicy(state, scope, option.id) &&
      policyModeHasAvailableProvider(state.policy!, scope, option.id, providerCatalog)
  );
}

export function reconcilePolicyModeSelection<T extends { id: InferenceMode; disabled?: boolean }>(
  options: T[],
  scope: PolicyScope,
  state: PolicyDecisionSnapshot,
  selectedMode: InferenceMode,
  providerCatalog?: Pick<PolicySelectionCatalog, "byokProviders" | "enterpriseProviders">
): InferenceMode | null {
  const allowedOptions = filterModeOptionsByPolicy(options, scope, state, providerCatalog);
  if (allowedOptions.some((option) => option.id === selectedMode && !option.disabled)) return null;
  return allowedOptions.find((option) => !option.disabled)?.id ?? null;
}

export function filterByokProviderOptionsByPolicy<T extends { id: string }>(
  options: T[],
  scope: PolicyScope,
  state: PolicyDecisionSnapshot
): T[] {
  if (state.status !== "managed" || !state.policy) return options;
  return options.filter((option) => isProviderAllowedByPolicy(state, scope, option.id));
}

export function filterEnterpriseProviderOptionsByPolicy<T extends { id: string }>(
  options: T[],
  state: PolicyDecisionSnapshot
): T[] {
  if (state.status !== "managed" || !state.policy) return options;
  return options.filter((option) => isEnterpriseProviderAllowed(state, option.id));
}

export function shouldPersistProviderFallback(
  state: PolicyDecisionSnapshot,
  _isSignedIn: boolean
): boolean {
  return state.status !== "managed";
}

export function reconcileProviderSelection<T extends { id: string; disabled?: boolean }>(
  selectedProvider: string,
  allowedProviders: readonly T[]
): string | null {
  if (allowedProviders.some((provider) => provider.id === selectedProvider && !provider.disabled)) {
    return null;
  }
  return allowedProviders.find((provider) => !provider.disabled)?.id ?? null;
}

interface CloudProviderOption {
  id: string;
  models?: ReadonlyArray<{ id: string }>;
}

export function reconcileCloudProviderSelection({
  selectedProvider,
  selectedModel,
  allowedProviders,
  customAllowed,
  hasCustomUrl,
}: {
  selectedProvider: string;
  selectedModel: string;
  allowedProviders: readonly CloudProviderOption[];
  customAllowed: boolean;
  hasCustomUrl: boolean;
}): { provider: string; model: string } | null {
  if (selectedProvider === "custom" && customAllowed) return null;
  const selected = allowedProviders.find((provider) => provider.id === selectedProvider);
  if (selected) {
    if (!selected.models?.length || selected.models.some((model) => model.id === selectedModel)) {
      return null;
    }
    return { provider: selected.id, model: selected.models[0].id };
  }
  if (hasCustomUrl && customAllowed) {
    return { provider: "custom", model: selectedModel || "whisper-1" };
  }
  const first = allowedProviders[0];
  if (!first) {
    return customAllowed ? { provider: "custom", model: selectedModel || "whisper-1" } : null;
  }
  return { provider: first.id, model: first.models?.[0]?.id ?? "" };
}
