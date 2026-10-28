import { PENDING_LOCAL_MODELS_KEY } from "./pendingLocalModels";
import type { PermissionGuideId } from "../../types/permissionGuide";

export const ONBOARDING_SESSION_KEY = "onboardingSessionV2";
export const LEGACY_ONBOARDING_STEP_KEY = "onboardingCurrentStep";
export const ONBOARDING_FLOW_VERSION = 2;

export const RESUME_DRAFT_PERSIST_DELAY_MS = 400;

type OnboardingStorage = Pick<Storage, "setItem" | "removeItem">;

export type OnboardingStepId =
  | "required-models"
  | "permissions"
  | "languages"
  | "use-cases"
  | "dictation-hotkey"
  | "activation-mode"
  | "dictation-demo"
  | "assistant-hotkey"
  | "assistant-demo"
  | "setup-choice"
  | "byok-dictation"
  | "byok-assistant"
  | "local-dictation"
  | "local-assistant";

export type OnboardingAuthPath = "account" | "guest" | null;
export type OnboardingSetupMode = "byok" | "local" | null;
export type OnboardingAuthMode = "sign-in" | "sign-up" | null;
export type OnboardingByokStepId = "byok-dictation" | "byok-assistant";
export type OnboardingLocalStepId = "local-dictation" | "local-assistant";

export interface OnboardingSsoDiscoveryDraft {
  required: boolean;
  domain: string;
  exists: boolean;
}

export interface OnboardingAuthDraft {
  authMode: OnboardingAuthMode;
  email: string;
  fullName: string;
  ssoDiscovery: OnboardingSsoDiscoveryDraft | null;
  pendingVerificationEmail: string | null;
}

export interface OnboardingByokDraft {
  selectedProvider: string;
  selectedModel: string;
  baseUrl: string;
  customModel: string;
}

export interface OnboardingLocalModelDraft {
  provider: string;
  modelId: string;
}

export interface OnboardingResumeState {
  dictationHotkeyConfirmed: boolean;
  assistantHotkeyConfirmed: boolean;
  dictationDemoCompleted: boolean;
  assistantDemoCompleted: boolean;
  auth: OnboardingAuthDraft;
  byok: Partial<Record<OnboardingByokStepId, OnboardingByokDraft>>;
  localModels: Partial<Record<OnboardingLocalStepId, OnboardingLocalModelDraft>>;
}

export interface OnboardingSession {
  version: typeof ONBOARDING_FLOW_VERSION;
  currentStepId: OnboardingStepId;
  history: OnboardingStepId[];
  authPath: OnboardingAuthPath;
  setupMode: OnboardingSetupMode;
  selfHostedRequested: boolean;
  screenContextRequested: boolean;
  permissionGuide: PermissionGuideId | null;
  resume: OnboardingResumeState;
}

export interface OnboardingRouteContext {
  authPath?: OnboardingAuthPath;
  setupMode: OnboardingSetupMode;
  agentAllowed: boolean;
  requiredModelsPending?: boolean;
  skipSetupChoice?: boolean;
}

const BASE_ROUTE: OnboardingStepId[] = [
  "permissions",
  "languages",
  "use-cases",
  "dictation-hotkey",
  "dictation-demo",
];

const SETUP_ROUTES: Record<Exclude<OnboardingSetupMode, null>, OnboardingStepId[]> = {
  byok: ["byok-dictation", "byok-assistant"],
  local: ["local-dictation", "local-assistant"],
};

const STEP_ORDER: OnboardingStepId[] = [
  "required-models",
  "permissions",
  "languages",
  "use-cases",
  "dictation-hotkey",
  "activation-mode",
  "dictation-demo",
  "assistant-hotkey",
  "assistant-demo",
  "setup-choice",
  "byok-dictation",
  "byok-assistant",
  "local-dictation",
  "local-assistant",
];

const KNOWN_STEPS = new Set<OnboardingStepId>(STEP_ORDER);
const PERMISSIONS_STEP_INDEX = STEP_ORDER.indexOf("permissions");

export function shouldInitializeMacAccessibilityFeatures(stepId: OnboardingStepId): boolean {
  return STEP_ORDER.indexOf(stepId) >= PERMISSIONS_STEP_INDEX;
}

export const COMPACT_STEPS: ReadonlySet<OnboardingStepId> = new Set<OnboardingStepId>([
  "permissions",
]);

const LEGACY_STEP_MAP: OnboardingStepId[] = [
  "permissions",
  "permissions",
  "permissions",
  "permissions",
  "dictation-hotkey",
  "assistant-hotkey",
  "setup-choice",
  "setup-choice",
];

export function createOnboardingResumeState(): OnboardingResumeState {
  return {
    dictationHotkeyConfirmed: false,
    assistantHotkeyConfirmed: false,
    dictationDemoCompleted: false,
    assistantDemoCompleted: false,
    auth: {
      authMode: null,
      email: "",
      fullName: "",
      ssoDiscovery: null,
      pendingVerificationEmail: null,
    },
    byok: {},
    localModels: {},
  };
}

export function createOnboardingSession(): OnboardingSession {
  return {
    version: ONBOARDING_FLOW_VERSION,
    currentStepId: "permissions",
    history: [],
    authPath: "guest",
    setupMode: null,
    selfHostedRequested: false,
    screenContextRequested: false,
    permissionGuide: null,
    resume: createOnboardingResumeState(),
  };
}

export function resetOnboardingProgress(storage: OnboardingStorage): void {
  storage.removeItem(ONBOARDING_SESSION_KEY);
  storage.removeItem("onboardingCompleted");
  storage.removeItem("authenticationSkipped");
  storage.removeItem("skipAuth");
  storage.removeItem("localSetupPending");
  storage.removeItem(PENDING_LOCAL_MODELS_KEY);
  storage.setItem(LEGACY_ONBOARDING_STEP_KEY, "0");
}

export function getOnboardingRoute(context: OnboardingRouteContext): OnboardingStepId[] {
  const setupChoice = context.skipSetupChoice ? [] : (["setup-choice"] as OnboardingStepId[]);

  const route: OnboardingStepId[] = [
    ...BASE_ROUTE,
    ...(context.agentAllowed
      ? (["assistant-hotkey", "assistant-demo"] as OnboardingStepId[])
      : []),
    ...setupChoice,
  ];

  if (context.requiredModelsPending) {
    route.unshift("required-models");
  }

  if (context.setupMode) {
    route.push(
      ...SETUP_ROUTES[context.setupMode].filter(
        (stepId) => context.agentAllowed || !stepId.endsWith("assistant")
      )
    );
  }

  return route;
}

export function getNotesFooterAction({
  setupDecisionPending,
  hasConnectedCalendar,
}: {
  setupDecisionPending: boolean;
  hasConnectedCalendar: boolean;
}): "skip" | "continue" | "loading" {
  if (setupDecisionPending) return "loading";
  return hasConnectedCalendar ? "continue" : "skip";
}

export function isSetupDecisionStep(stepId: OnboardingStepId, route: OnboardingStepId[]): boolean {
  const setupChoiceIndex = route.indexOf("setup-choice");
  const decisionStep = setupChoiceIndex === -1 ? route.at(-1) : route[setupChoiceIndex - 1];
  return stepId === decisionStep;
}

export function isOnboardingStepId(value: unknown): value is OnboardingStepId {
  return typeof value === "string" && KNOWN_STEPS.has(value as OnboardingStepId);
}

function isPermissionGuideId(value: unknown): value is PermissionGuideId {
  return (
    typeof value === "string" &&
    ["microphone", "accessibility", "system-audio", "screen-context"].includes(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readDraftString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseByokDraft(value: unknown): OnboardingByokDraft | undefined {
  if (!isRecord(value)) return undefined;
  return {
    selectedProvider: readDraftString(value.selectedProvider),
    selectedModel: readDraftString(value.selectedModel),
    baseUrl: readDraftString(value.baseUrl),
    customModel: readDraftString(value.customModel),
  };
}

function parseLocalModelDraft(value: unknown): OnboardingLocalModelDraft | undefined {
  if (!isRecord(value)) return undefined;
  return {
    provider: readDraftString(value.provider),
    modelId: readDraftString(value.modelId),
  };
}

function inferResumeFlagsFromStep(currentStepId: OnboardingStepId): OnboardingResumeState {
  const isPast = (stepId: OnboardingStepId) =>
    STEP_ORDER.indexOf(currentStepId) > STEP_ORDER.indexOf(stepId);
  return {
    ...createOnboardingResumeState(),
    dictationHotkeyConfirmed: isPast("dictation-hotkey"),
    assistantHotkeyConfirmed: isPast("assistant-hotkey"),
  };
}

function parseOnboardingResumeState(
  value: unknown,
  currentStepId: OnboardingStepId
): OnboardingResumeState {
  if (value === undefined) return inferResumeFlagsFromStep(currentStepId);
  const defaults = createOnboardingResumeState();
  if (!isRecord(value)) return defaults;

  const byokValue = isRecord(value.byok) ? value.byok : {};
  const localModelsValue = isRecord(value.localModels) ? value.localModels : {};
  const byokDictation = parseByokDraft(byokValue["byok-dictation"]);
  const byokAssistant = parseByokDraft(byokValue["byok-assistant"]);
  const localDictation = parseLocalModelDraft(localModelsValue["local-dictation"]);
  const localAssistant = parseLocalModelDraft(localModelsValue["local-assistant"]);

  return {
    ...defaults,
    dictationHotkeyConfirmed: value.dictationHotkeyConfirmed === true,
    assistantHotkeyConfirmed: value.assistantHotkeyConfirmed === true,
    dictationDemoCompleted: value.dictationDemoCompleted === true,
    assistantDemoCompleted: value.assistantDemoCompleted === true,
    byok: {
      ...(byokDictation ? { "byok-dictation": byokDictation } : {}),
      ...(byokAssistant ? { "byok-assistant": byokAssistant } : {}),
    },
    localModels: {
      ...(localDictation ? { "local-dictation": localDictation } : {}),
      ...(localAssistant ? { "local-assistant": localAssistant } : {}),
    },
  };
}

export function parseOnboardingSession(value: string | null): OnboardingSession | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<OnboardingSession> & { currentStepId?: string };
    if (
      parsed.version !== ONBOARDING_FLOW_VERSION ||
      !Array.isArray(parsed.history)
    ) {
      return null;
    }

    const rawStep = parsed.currentStepId === "auth" ? "permissions" : parsed.currentStepId;
    if (!isOnboardingStepId(rawStep)) return null;

    const setupMode = parsed.setupMode === "byok" || parsed.setupMode === "local" ? parsed.setupMode : null;

    return {
      version: ONBOARDING_FLOW_VERSION,
      currentStepId: rawStep,
      history: parsed.history.filter(isOnboardingStepId),
      authPath: "guest",
      setupMode,
      selfHostedRequested: Boolean(parsed.selfHostedRequested),
      screenContextRequested: Boolean(parsed.screenContextRequested),
      permissionGuide: isPermissionGuideId(parsed.permissionGuide) ? parsed.permissionGuide : null,
      resume: parseOnboardingResumeState(parsed.resume, rawStep),
    };
  } catch {
    return null;
  }
}

export function isRequiredModelsOnboardingStepActive(sessionValue: string | null): boolean {
  return parseOnboardingSession(sessionValue)?.currentStepId === "required-models";
}

export function migrateLegacyOnboardingStep(value: string | null): OnboardingStepId {
  if (!value || value === "auth") return "permissions";
  if (isOnboardingStepId(value)) return value;

  const index = Number.parseInt(value, 10);
  if (!Number.isFinite(index) || index < 0) return "permissions";
  return LEGACY_STEP_MAP[Math.min(index, LEGACY_STEP_MAP.length - 1)] ?? "permissions";
}

export function reconcileStepWithRoute(
  stepId: OnboardingStepId,
  route: OnboardingStepId[]
): OnboardingStepId {
  if (route.includes(stepId)) return stepId;
  const target = STEP_ORDER.indexOf(stepId);
  if (target === -1 || route.length === 0) return route[0] ?? "permissions";
  return route.reduce((best, candidate) => {
    const bestDistance = Math.abs(STEP_ORDER.indexOf(best) - target);
    const candidateDistance = Math.abs(STEP_ORDER.indexOf(candidate) - target);
    return candidateDistance < bestDistance ? candidate : best;
  }, route[0]);
}

export function getNextOnboardingStep(
  currentStepId: OnboardingStepId,
  route: OnboardingStepId[]
): OnboardingStepId | null {
  const index = route.indexOf(currentStepId);
  return index >= 0 ? (route[index + 1] ?? null) : (route[0] ?? null);
}

export interface OnboardingProgressState {
  index: number;
  total: number;
}

export function getOnboardingProgress(
  stepId: OnboardingStepId,
  route: OnboardingStepId[]
): OnboardingProgressState | null {
  if (COMPACT_STEPS.has(stepId)) return null;

  const counted = route.filter((candidate) => !COMPACT_STEPS.has(candidate));
  const index = counted.indexOf(stepId);
  if (index === -1 || counted.length < 2) return null;

  return { index, total: counted.length };
}

export interface OnboardingWorkspaceEntitlement {
  id: string;
  plan?: string | null;
  status?: string | null;
}

export function isEnterpriseWorkspaceEntitled(
  _workspace: Pick<OnboardingWorkspaceEntitlement, "plan" | "status"> | null | undefined
): boolean {
  return false;
}

export function resolveEnterpriseWorkspaceForOnboarding<T extends OnboardingWorkspaceEntitlement>(
  _activeWorkspace: T | null | undefined,
  _workspaces: T[]
): T | null {
  return null;
}

export function shouldSkipOnboardingSetupChoice(_params: unknown): boolean {
  return false;
}
