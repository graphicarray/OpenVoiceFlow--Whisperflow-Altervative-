import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "./icons";
import UseCaseStep from "./onboarding/UseCaseStep";
import { hasUseCaseIntent } from "./onboarding/useCases";
import OnboardingShell, { OnboardingStepHeader } from "./onboarding/OnboardingShell";
import CompactPermissionsStep from "./onboarding/CompactPermissionsStep";
import LanguageSelectionStep from "./onboarding/LanguageSelectionStep";
import ShortcutSetupStep from "./onboarding/ShortcutSetupStep";
import AssistantHotkeyPreview from "./onboarding/AssistantHotkeyPreview";
import DemoStep from "./onboarding/DemoStep";
import SetupChoiceStep from "./onboarding/SetupChoiceStep";
import { ByokProviderStep, LocalModelSetupStep } from "./onboarding/ProviderSetupStep";
import { RequiredModelDownloadStep } from "./onboarding/RequiredModelDownloadStep";
import { AlertDialog } from "./ui/dialog";
import { usePermissions } from "../hooks/usePermissions";
import { useClipboard } from "../hooks/useClipboard";
import { useScreenRecordingPermission } from "../hooks/useScreenRecordingPermission";
import { useSystemAudioPermission } from "../hooks/useSystemAudioPermission";
import { useSettings } from "../hooks/useSettings";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useHotkeyRegistration } from "../hooks/useHotkeyRegistration";
import { useHotkeyModeInfo } from "../hooks/useHotkeyModeInfo";
import { useRequiredLocalModels } from "../hooks/useRequiredLocalModels";
import { usePolicyStore } from "../stores/policyStore";
import { isAgentAllowed, isScreenContextAllowed } from "../stores/policyRules";
import { useSettingsStore } from "../stores/settingsStore";
import { getDefaultHotkey, parseHotkeyList, serializeHotkeyList } from "../utils/hotkeys";
import {
  DEFAULT_ASSISTANT_ONBOARDING_HOTKEY,
  formatHotkeyInstruction,
  getRecommendedDictationHotkeys,
  resolveOnboardingAssistantHotkey,
  resolveOnboardingDictationHotkey,
} from "./onboarding/hotkeyPresentation";
import { getValidationMessage } from "../utils/hotkeyValidator";
import { validateHotkeyForSlot } from "../utils/hotkeyValidation";
import { getPlatform } from "../utils/platform";
import { ACCESSIBILITY_SKIPPED_KEY, areRequiredPermissionsMet } from "../utils/permissions";
import logger from "../utils/logger";
import {
  COMPACT_STEPS,
  getNextOnboardingStep,
  getOnboardingProgress,
  getOnboardingRoute,
  isSetupDecisionStep,
  reconcileStepWithRoute,
  resolveEnterpriseWorkspaceForOnboarding,
  shouldInitializeMacAccessibilityFeatures,
  shouldSkipOnboardingSetupChoice,
  type OnboardingByokDraft,
  type OnboardingLocalModelDraft,
  type OnboardingResumeState,
  type OnboardingSetupMode,
  type OnboardingStepId,
} from "./onboarding/flow";
import { useOnboardingSession } from "./onboarding/useOnboardingSession";
import { usePermissionGuide } from "./onboarding/usePermissionGuide";
import {
  requestMicrophoneForGuide,
  type GuidePermission,
} from "./onboarding/permissionGuideController";
import { clearPendingLocalModels, hasPendingLocalModels } from "./onboarding/pendingLocalModels";
import { resolveAssistantDemoScenario } from "./onboarding/assistantDemoScenario";
import { ActivationModeSelector } from "./ui/ActivationModeSelector";
import LinuxPttSetupInfo from "./ui/LinuxPttSetupInfo";

interface OnboardingFlowProps {
  onComplete: (options?: { openSettings?: boolean }) => void;
}

type OnboardingCompletionMode = Exclude<OnboardingSetupMode, null> | "managed";

function DemoHotkeyDescription({ text, hotkey }: { text: string; hotkey: string }) {
  const hotkeyStart = text.indexOf(hotkey);
  if (hotkeyStart < 0) return text;

  return (
    <>
      {text.slice(0, hotkeyStart)}
      <kbd className="mx-0.5 inline-flex rounded-md bg-[color-mix(in_srgb,var(--onboarding-accent)_12%,transparent)] px-1.5 py-0.5 font-semibold text-[var(--onboarding-accent)]">
        {hotkey}
      </kbd>
      {text.slice(hotkeyStart + hotkey.length)}
    </>
  );
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { t } = useTranslation();
  const platform = getPlatform();
  const isSignedIn = false;
  const agentAllowed = usePolicyStore(isAgentAllowed);
  const screenContextAllowed = usePolicyStore(isScreenContextAllowed);
  const settings = useSettings();
  const settingsStore = useSettingsStore();
  const {
    session,
    setSession,
    goTo,
    goBack,
    setSetupMode,
    setSelfHostedRequested,
    setScreenContextRequested,
    setPermissionGuide,
    clearSession,
  } = useOnboardingSession();

  const { dictationHotkeyConfirmed, assistantHotkeyConfirmed } = session.resume;
  const [dictationHotkey, setDictationHotkey] = useState(() =>
    resolveOnboardingDictationHotkey({
      platform,
      savedHotkey: parseHotkeyList(settings.dictationKey)[0] ?? "",
      platformDefault: getDefaultHotkey(),
      confirmed: dictationHotkeyConfirmed,
    })
  );
  const [assistantHotkey, setAssistantHotkey] = useState(() =>
    resolveOnboardingAssistantHotkey(parseHotkeyList(settings.voiceAgentKey)[0] ?? "")
  );
  const [recommendedDictationHotkey, setRecommendedDictationHotkey] = useState(getDefaultHotkey);
  const dictationDemoSuccess = session.resume.dictationDemoCompleted;
  const assistantDemoSuccess = session.resume.assistantDemoCompleted;
  const [stageReady, setStageReady] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [permissionAlert, setPermissionAlert] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [, setAccessibilitySkipped] = useLocalStorage(ACCESSIBILITY_SKIPPED_KEY, false);

  const updateResumeFlag = useCallback(
    (
      key: Extract<
        keyof OnboardingResumeState,
        | "dictationHotkeyConfirmed"
        | "assistantHotkeyConfirmed"
        | "dictationDemoCompleted"
        | "assistantDemoCompleted"
      >,
      value: boolean
    ) => {
      setSession((current) => ({
        ...current,
        resume: { ...current.resume, [key]: value },
      }));
    },
    [setSession]
  );
  const setDictationHotkeyConfirmed = useCallback(
    (confirmed: boolean) => updateResumeFlag("dictationHotkeyConfirmed", confirmed),
    [updateResumeFlag]
  );
  const setAssistantHotkeyConfirmed = useCallback(
    (confirmed: boolean) => updateResumeFlag("assistantHotkeyConfirmed", confirmed),
    [updateResumeFlag]
  );
  const setDictationDemoSuccess = useCallback(
    (successful: boolean) => updateResumeFlag("dictationDemoCompleted", successful),
    [updateResumeFlag]
  );
  const setAssistantDemoSuccess = useCallback(
    (successful: boolean) => updateResumeFlag("assistantDemoCompleted", successful),
    [updateResumeFlag]
  );

  useClipboard((dialog) =>
    setPermissionAlert({ title: dialog.title, description: dialog.description })
  );
  const systemAudio = useSystemAudioPermission();
  const {
    granted: screenRecordingGranted,
    needsRelaunch: screenRecordingNeedsRelaunch,
    loaded: screenRecordingLoaded,
    check: checkScreenRecording,
    request: requestScreenRecordingAccess,
  } = useScreenRecordingPermission();
  const {
    supportsPushToTalk,
    pushToTalkUnavailableReason,
    linuxInputAccessDenied,
    loaded: hotkeyModeLoaded,
  } = useHotkeyModeInfo("onboarding", dictationHotkey);
  const { activationMode, setActivationMode } = settings;

  const activeWorkspace = null;
  const workspaces = useMemo(() => [], []);
  const workspacesLoaded = true;
  const setActiveWorkspace = useCallback(() => {}, []);
  const enterpriseWorkspace = useMemo(
    () => resolveEnterpriseWorkspaceForOnboarding(activeWorkspace, workspaces),
    [activeWorkspace, workspaces]
  );
  const skipSetupChoiceForEnterprise = shouldSkipOnboardingSetupChoice({
    isSignedIn,
    authPath: session.authPath,
    setupMode: session.setupMode,
    activeWorkspace: enterpriseWorkspace,
  });

  useEffect(() => {
    if (
      workspacesLoaded &&
      !activeWorkspace &&
      skipSetupChoiceForEnterprise &&
      enterpriseWorkspace
    ) {
      setActiveWorkspace();
    }
  }, [
    activeWorkspace,
    enterpriseWorkspace,
    setActiveWorkspace,
    skipSetupChoiceForEnterprise,
    workspacesLoaded,
  ]);

  const workspaceResolutionPending = false;
  const hasConnectedCalendar = false;

  const screenContextRequested = session.screenContextRequested;

  const applyScreenContext = useCallback(() => {
    setScreenContextRequested(false);
    settingsStore.setVoiceAgentScreenContext(true);
    void window.electronAPI?.setScreenContextEnabled?.(true);
  }, [setScreenContextRequested, settingsStore]);

  const enableScreenContext = useCallback(async () => {
    setScreenContextRequested(true);
    const granted = await requestScreenRecordingAccess();
    if (granted) applyScreenContext();
    return granted;
  }, [applyScreenContext, requestScreenRecordingAccess, setScreenContextRequested]);

  useEffect(() => {
    if (!screenRecordingGranted || !agentAllowed || !screenContextAllowed) return;
    if (screenContextRequested) {
      applyScreenContext();
    }
  }, [
    agentAllowed,
    applyScreenContext,
    screenContextAllowed,
    screenContextRequested,
    screenRecordingGranted,
  ]);

  const requiredModels = useRequiredLocalModels();
  const requiredModelsLatchRef = useRef(session.currentStepId === "required-models");
  const requiredModelsPending = requiredModelsLatchRef.current || requiredModels.missing.length > 0;

  const route = useMemo(
    () =>
      getOnboardingRoute({
        authPath: session.authPath,
        setupMode: session.setupMode,
        agentAllowed,
        requiredModelsPending,
        skipSetupChoice: skipSetupChoiceForEnterprise,
      }),
    [
      agentAllowed,
      requiredModelsPending,
      session.authPath,
      session.setupMode,
      skipSetupChoiceForEnterprise,
    ]
  );
  const currentStepId = reconcileStepWithRoute(session.currentStepId, route);
  const compact = COMPACT_STEPS.has(currentStepId);
  const setupDecisionPending =
    workspaceResolutionPending && isSetupDecisionStep(currentStepId, route);

  const screenContextActive =
    agentAllowed &&
    screenContextAllowed &&
    settingsStore.voiceAgentScreenContext &&
    screenRecordingGranted &&
    !screenRecordingNeedsRelaunch;

  const permissions = usePermissions(
    (dialog) => setPermissionAlert({ title: dialog.title, description: dialog.description }),
    {
      macAccessibilityChecksEnabled: shouldInitializeMacAccessibilityFeatures(currentStepId),
    }
  );
  const openSettings =
    (open: () => Promise<{ success: boolean; error?: string }>) => async (): Promise<void> => {
      const result = await open();
      if (!result.success) throw new Error(result.error);
    };
  const openMicrophoneSettings = openSettings(window.electronAPI.openMicrophoneSettings);
  const openAccessibilitySettings = openSettings(window.electronAPI.openAccessibilitySettings);
  const guideRows: GuidePermission[] = [
    {
      id: "microphone",
      request: async () => {
        const result = await requestMicrophoneForGuide({
          requestAccess: window.electronAPI.requestMicrophoneAccess,
          checkAccess: window.electronAPI.checkMicrophoneAccess,
          openSettings: openMicrophoneSettings,
        });
        permissions.setMicPermissionGranted(result.granted);
      },
      check: async () => {
        const result = await window.electronAPI.checkMicrophoneAccess();
        permissions.setMicPermissionGranted(result.granted);
        return result;
      },
      openSettings: openMicrophoneSettings,
    },
    {
      id: "accessibility",
      request: openAccessibilitySettings,
      check: async () => {
        const granted = await window.electronAPI.checkAccessibilityPermission(true);
        permissions.setAccessibilityPermissionGranted(granted);
        return { granted };
      },
      openSettings: openAccessibilitySettings,
    },
  ];
  if (systemAudio.mode === "native")
    guideRows.push({
      id: "system-audio",
      request: systemAudio.request,
      check: async () => {
        await systemAudio.check();
        return window.electronAPI.checkSystemAudioAccess();
      },
      verify: async () => {
        const result = await window.electronAPI.verifySystemAudioAccess();
        await systemAudio.check();
        return result;
      },
      openSettings: openSettings(window.electronAPI.openSystemAudioSettings),
    });
  if (agentAllowed && screenContextAllowed)
    guideRows.push({
      id: "screen-context",
      request: async () => {
        setScreenContextRequested(true);
        return requestScreenRecordingAccess();
      },
      onGranted: applyScreenContext,
      check: async () => {
        const result = await window.electronAPI.checkScreenRecordingAccess();
        await checkScreenRecording();
        return result;
      },
      openSettings: openSettings(window.electronAPI.openScreenRecordingSettings),
    });
  const guideReady = platform === "darwin" && systemAudio.loaded && screenRecordingLoaded;
  const permissionGuide = usePermissionGuide({
    enabled: currentStepId === "permissions" && guideReady,
    progress: session.permissionGuide,
    save: setPermissionGuide,
    dismissed: () => setScreenContextRequested(false),
    rows: guideRows,
  });

  useEffect(() => {
    if (currentStepId !== "permissions" && session.permissionGuide) setPermissionGuide(null);
  }, [currentStepId, session.permissionGuide, setPermissionGuide]);
  const updateCurrentByokDraft = useCallback(
    (state: OnboardingByokDraft) => {
      if (currentStepId !== "byok-dictation" && currentStepId !== "byok-assistant") return;
      setSession((current) => ({
        ...current,
        resume: {
          ...current.resume,
          byok: { ...current.resume.byok, [currentStepId]: state },
        },
      }));
    },
    [currentStepId, setSession]
  );
  const updateCurrentLocalModelDraft = useCallback(
    (state: OnboardingLocalModelDraft) => {
      if (currentStepId !== "local-dictation" && currentStepId !== "local-assistant") return;
      setSession((current) => ({
        ...current,
        resume: {
          ...current.resume,
          localModels: { ...current.resume.localModels, [currentStepId]: state },
        },
      }));
    },
    [currentStepId, setSession]
  );

  useEffect(() => {
    if (currentStepId === "required-models") requiredModelsLatchRef.current = true;
  }, [currentStepId]);

  useEffect(() => {
    if (currentStepId !== "dictation-hotkey" || !hotkeyModeLoaded) return;
    if (supportsPushToTalk && localStorage.getItem("activationMode") === null) {
      setActivationMode("push");
    }
  }, [currentStepId, hotkeyModeLoaded, setActivationMode, supportsPushToTalk]);

  useEffect(() => {
    if (
      requiredModelsPending &&
      currentStepId === "permissions" &&
      !requiredModelsLatchRef.current &&
      route.includes("required-models")
    ) {
      goTo("required-models");
    }
  }, [currentStepId, goTo, requiredModelsPending, route]);

  useEffect(() => {
    if (session.currentStepId !== currentStepId) {
      setSession((current) => ({ ...current, currentStepId }));
    }
  }, [currentStepId, session.currentStepId, setSession]);

  useEffect(() => {
    void window.electronAPI?.setOnboardingActive?.(true);
  }, []);

  useEffect(() => {
    void window.electronAPI?.setOnboardingWindowMode?.(compact ? "compact" : "expanded");
  }, [compact]);

  useEffect(() => {
    if (platform === "darwin" && shouldInitializeMacAccessibilityFeatures(currentStepId)) {
      window.electronAPI?.markMacAccessibilityFeaturesReady?.();
    }
  }, [currentStepId, platform]);

  useEffect(() => {
    setStageReady(false);
  }, [currentStepId]);

  useEffect(() => {
    let cancelled = false;
    void window.electronAPI
      ?.getEffectiveDefaultHotkey?.()
      .then((key) => {
        const effective = key && parseHotkeyList(key)[0];
        if (cancelled || !effective) return;
        setRecommendedDictationHotkey(effective);
        setDictationHotkey((current) => (current === getDefaultHotkey() ? effective : current));
      })
      .catch((error) =>
        logger.warn("Failed to read effective default hotkey", { error }, "onboarding")
      );
    const unsubscribe = window.electronAPI?.onHotkeyFallbackUsed?.((data) => {
      const fallback = parseHotkeyList(data?.fallback)[0];
      if (!fallback) return;
      setDictationHotkey(fallback);
      setRecommendedDictationHotkey(fallback);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const withExtraDictationHotkeys = useCallback(
    (primary: string) =>
      serializeHotkeyList([primary, ...parseHotkeyList(settings.dictationKey).slice(1)]),
    [settings.dictationKey]
  );

  const hotkeyErrorRef = useRef<string | null>(null);
  const { registerHotkey, isRegistering } = useHotkeyRegistration({
    onSuccess: (registered) => {
      const primary = parseHotkeyList(registered)[0] || registered;
      setDictationHotkey(primary);
      settings.setDictationKey(registered);
    },
    onError: (message) => {
      hotkeyErrorRef.current = message;
    },
    showSuccessToast: false,
    showErrorToast: false,
  });

  const validateDictationHotkey = useCallback(
    (value: string) => getValidationMessage(value, platform),
    [platform]
  );
  const validateAssistantHotkey = useCallback(
    (value: string) =>
      validateHotkeyForSlot(
        value,
        { "settingsPage.general.hotkey.title": withExtraDictationHotkeys(dictationHotkey) },
        t
      ),
    [dictationHotkey, t, withExtraDictationHotkeys]
  );

  const confirmDictationHotkey = useCallback(
    async (value: string) => {
      if (activationMode === "push") {
        const info = await window.electronAPI?.getHotkeyModeInfo?.(value);
        if (info && !info.supportsPushToTalk) setActivationMode("tap");
      }
      hotkeyErrorRef.current = null;
      const registered = await registerHotkey(withExtraDictationHotkeys(value));
      return registered ? null : (hotkeyErrorRef.current ?? t("onboarding.rehaul.hotkey.inUse"));
    },
    [activationMode, registerHotkey, setActivationMode, t, withExtraDictationHotkeys]
  );

  const confirmAssistantHotkey = useCallback(
    async (value: string) => {
      const result = await settings.setVoiceAgentKey(
        serializeHotkeyList([value, ...parseHotkeyList(settings.voiceAgentKey).slice(1)])
      );
      return result.success ? null : result.message || t("onboarding.rehaul.hotkey.inUse");
    },
    [settings, t]
  );

  const syncUseCases = useCallback(() => {}, []);

  const finalizeOnboarding = useCallback(
    async (mode: OnboardingCompletionMode) => {
      if (isFinishing) return;
      setIsFinishing(true);
      setFatalError(null);
      try {
        const registered = await registerHotkey(withExtraDictationHotkeys(dictationHotkey));
        if (!registered) {
          setFatalError(t("onboarding.hotkey.couldNotRegisterDescription"));
          return;
        }

        await window.electronAPI?.saveAllKeysToEnv?.();
        await window.electronAPI?.markBundleMigrated?.();
        await window.electronAPI?.setOnboardingWindowMode?.("restore");

        const routeKeepsLocalModels = mode === "local";
        if (routeKeepsLocalModels && hasPendingLocalModels()) {
          localStorage.setItem("localSetupPending", "true");
        } else {
          localStorage.removeItem("localSetupPending");
          clearPendingLocalModels();
        }

        localStorage.setItem("authenticationSkipped", "true");
        localStorage.setItem("skipAuth", "true");
        clearSession();
        localStorage.setItem("onboardingCompleted", "true");
        onComplete();
      } catch (error) {
        logger.error("Failed to finish onboarding", { error }, "onboarding");
        setFatalError(t("common.unknownError"));
      } finally {
        setIsFinishing(false);
      }
    },
    [
      clearSession,
      dictationHotkey,
      isFinishing,
      onComplete,
      registerHotkey,
      t,
      withExtraDictationHotkeys,
    ]
  );

  useEffect(() => {
    if (!skipSetupChoiceForEnterprise || session.currentStepId !== "setup-choice" || isFinishing) {
      return;
    }
    void finalizeOnboarding("managed");
  }, [finalizeOnboarding, isFinishing, session.currentStepId, skipSetupChoiceForEnterprise]);

  const applyReasoningSelectionToAllScopes = useCallback(
    (mode: "byok" | "local") => {
      const {
        chatAgentProvider,
        chatAgentModel,
        chatAgentCloudBaseUrl,
        chatAgentRemoteUrl,
        chatAgentCustomApiKey,
      } = useSettingsStore.getState();
      settingsStore.setCloudReasoningForAllScopes({
        cleanupCloudMode: mode,
        cleanupProvider: chatAgentProvider,
        cleanupModel: chatAgentModel,
        cleanupCloudBaseUrl: chatAgentCloudBaseUrl,
        cleanupRemoteUrl: chatAgentRemoteUrl,
        ...(chatAgentCustomApiKey ? { cleanupCustomApiKey: chatAgentCustomApiKey } : {}),
        useCleanupModel: true,
        useDictationAgent: true,
      });
    },
    [settingsStore]
  );

  const handleSetupSelection = useCallback(
    async (mode: Exclude<OnboardingSetupMode, null>, options?: { selfHosted?: boolean }) => {
      setSetupMode(mode);
      setSelfHostedRequested(!!options?.selfHosted);
      const nextRoute = getOnboardingRoute({
        authPath: session.authPath,
        setupMode: mode,
        agentAllowed,
        requiredModelsPending,
      });
      const next = getNextOnboardingStep("setup-choice", nextRoute);
      if (next) goTo(next);
    },
    [
      agentAllowed,
      goTo,
      requiredModelsPending,
      session.authPath,
      setSelfHostedRequested,
      setSetupMode,
    ]
  );

  const continueFromCurrentStep = useCallback(async () => {
    setFatalError(null);
    if (setupDecisionPending) return;
    if (currentStepId === "permissions") {
      if (platform === "darwin" && !permissions.accessibilityPermissionGranted) {
        setAccessibilitySkipped(true);
      }
    } else if (currentStepId === "languages") {
      settings.setPreferredLanguage(
        settings.spokenLanguages.length === 1 ? settings.spokenLanguages[0] : "auto"
      );
    } else if (currentStepId === "use-cases") {
      syncUseCases();
    } else if (currentStepId === "dictation-hotkey") {
      const registered = await registerHotkey(withExtraDictationHotkeys(dictationHotkey));
      if (!registered) {
        setFatalError(t("onboarding.hotkey.couldNotRegisterDescription"));
        return;
      }
      setDictationHotkeyConfirmed(true);
    } else if (currentStepId === "assistant-hotkey") {
      if (parseHotkeyList(settings.voiceAgentKey)[0] !== assistantHotkey) {
        const result = await settings.setVoiceAgentKey(
          serializeHotkeyList([
            assistantHotkey,
            ...parseHotkeyList(settings.voiceAgentKey).slice(1),
          ])
        );
        if (!result.success) {
          setFatalError(result.message || t("onboarding.rehaul.hotkey.inUse"));
          return;
        }
      }
    } else if (currentStepId === "byok-dictation") {
      settingsStore.setCloudTranscriptionForAllScopes({
        useLocalWhisper: false,
        cloudTranscriptionMode: "byok",
      });
      if (!route.includes("byok-assistant")) {
        settingsStore.updateCleanupSettings({ useCleanupModel: false });
      }
    } else if (currentStepId === "byok-assistant") {
      applyReasoningSelectionToAllScopes("byok");
    } else if (currentStepId === "local-dictation") {
      settingsStore.setCloudTranscriptionForAllScopes({ useLocalWhisper: true });
      if (!route.includes("local-assistant")) {
        settingsStore.updateCleanupSettings({ useCleanupModel: false });
      }
    } else if (currentStepId === "local-assistant") {
      applyReasoningSelectionToAllScopes("local");
    }

    const next = getNextOnboardingStep(currentStepId, route);
    if (next) {
      goTo(next);
      return;
    }

    if (skipSetupChoiceForEnterprise) {
      await finalizeOnboarding("managed");
      return;
    }
    if (session.setupMode) await finalizeOnboarding(session.setupMode);
  }, [
    applyReasoningSelectionToAllScopes,
    assistantHotkey,
    currentStepId,
    dictationHotkey,
    finalizeOnboarding,
    goTo,
    permissions.accessibilityPermissionGranted,
    platform,
    registerHotkey,
    route,
    session.setupMode,
    setAccessibilitySkipped,
    setDictationHotkeyConfirmed,
    settings,
    settingsStore,
    syncUseCases,
    t,
    withExtraDictationHotkeys,
    setupDecisionPending,
    skipSetupChoiceForEnterprise,
  ]);

  const skipLocalSetup = useCallback(async () => {
    if (currentStepId === "local-dictation") {
      await continueFromCurrentStep();
      return;
    }
    settingsStore.updateCleanupSettings({ useCleanupModel: false });
    await finalizeOnboarding("local");
  }, [continueFromCurrentStep, currentStepId, finalizeOnboarding, settingsStore]);

  const canContinue = (() => {
    switch (currentStepId) {
      case "required-models":
        return !requiredModels.loading && requiredModels.missing.length === 0;
      case "permissions":
        return areRequiredPermissionsMet(permissions.micPermissionGranted);
      case "languages":
        return settings.spokenLanguages.length > 0;
      case "use-cases":
        return hasUseCaseIntent(settings.onboardingUseCases, settings.onboardingUseCaseNote);
      case "dictation-hotkey":
        return dictationHotkeyConfirmed;
      case "dictation-demo":
        return dictationDemoSuccess;
      case "assistant-hotkey":
        return assistantHotkeyConfirmed;
      case "assistant-demo":
        return assistantDemoSuccess;
      case "byok-dictation":
      case "byok-assistant":
      case "local-dictation":
      case "local-assistant":
        return stageReady;
      default:
        return true;
    }
  })();

  const renderStep = () => {
    switch (currentStepId) {
      case "required-models":
        return (
          <div className="h-full w-full pt-2">
            <OnboardingStepHeader
              title={t("onboarding.requiredModels.title")}
              wideTitle
              description={t("onboarding.requiredModels.description", {
                organization: t("onboarding.requiredModels.genericOrganization"),
              })}
            />
            <RequiredModelDownloadStep
              required={requiredModels.required}
              missing={requiredModels.missing}
              loading={requiredModels.loading}
              refresh={requiredModels.refresh}
              onProceed={() => void continueFromCurrentStep()}
            />
          </div>
        );

      case "permissions":
        return (
          <CompactPermissionsStep
            permissions={permissions}
            guide={{ ...permissionGuide, ready: guideReady }}
            systemAudio={systemAudio}
            screenContext={
              agentAllowed && screenContextAllowed
                ? {
                    enabled: settingsStore.voiceAgentScreenContext,
                    granted: screenRecordingGranted,
                    needsRelaunch: screenRecordingNeedsRelaunch,
                    request: enableScreenContext,
                  }
                : undefined
            }
            onBack={session.history.length > 0 ? goBack : undefined}
            onContinue={() => void continueFromCurrentStep()}
          />
        );

      case "languages":
        return (
          <div className="flex h-full min-h-0 w-full flex-col pt-1">
            <OnboardingStepHeader
              title={t("onboarding.rehaul.languages.title")}
              titleLines={[
                t("onboarding.rehaul.languages.titleLineOne"),
                t("onboarding.rehaul.languages.titleLineTwo"),
              ]}
              description={t("onboarding.rehaul.languages.description")}
            />
            <LanguageSelectionStep
              selected={settings.spokenLanguages}
              onChange={settings.setSpokenLanguages}
              searchPlaceholder={t("languageSelector.searchPlaceholder")}
              noResultsLabel={t("languageSelector.noLanguagesFound")}
              selectedLabel={t("onboarding.rehaul.languages.title")}
            />
          </div>
        );

      case "use-cases":
        return (
          <div className="h-full w-full pt-1">
            <UseCaseStep
              useCases={settings.onboardingUseCases}
              onUseCasesChange={settings.setOnboardingUseCases}
              note={settings.onboardingUseCaseNote}
              onNoteChange={settings.setOnboardingUseCaseNote}
            />
          </div>
        );

      case "dictation-hotkey":
      case "assistant-hotkey": {
        const assistant = currentStepId === "assistant-hotkey";
        return (
          <div className="flex h-full min-h-0 w-full flex-col pt-2">
            <OnboardingStepHeader
              title={t(
                assistant
                  ? "onboarding.rehaul.assistantHotkey.title"
                  : "onboarding.rehaul.dictationHotkey.title"
              )}
              titleLines={
                assistant
                  ? undefined
                  : [
                      t("onboarding.rehaul.dictationHotkey.titleLineOne"),
                      t("onboarding.rehaul.dictationHotkey.titleLineTwo"),
                    ]
              }
              wideTitle={assistant}
              wideDescription={assistant}
              description={t(
                assistant
                  ? "onboarding.rehaul.assistantHotkey.description"
                  : "onboarding.rehaul.dictationHotkey.description"
              )}
            />
            {assistant && <AssistantHotkeyPreview />}
            <ShortcutSetupStep
              value={assistant ? assistantHotkey : dictationHotkey}
              initiallyConfirmed={assistant ? assistantHotkeyConfirmed : dictationHotkeyConfirmed}
              onChange={(value) => {
                if (assistant) {
                  setAssistantHotkey(value);
                  setAssistantHotkeyConfirmed(true);
                } else {
                  setDictationHotkey(value);
                  setDictationHotkeyConfirmed(true);
                }
              }}
              onClearSelection={() => {
                if (assistant) {
                  setAssistantHotkey("");
                  setAssistantHotkeyConfirmed(false);
                } else {
                  setDictationHotkey("");
                  setDictationHotkeyConfirmed(false);
                }
              }}
              recommended={
                assistant
                  ? DEFAULT_ASSISTANT_ONBOARDING_HOTKEY
                  : getRecommendedDictationHotkeys(platform, recommendedDictationHotkey)
              }
              captureLabel={t("onboarding.rehaul.hotkey.capture")}
              recommendedLabel={t("common.recommended")}
              chooseAnotherLabel={t("onboarding.rehaul.hotkey.chooseAnother")}
              validate={assistant ? validateAssistantHotkey : validateDictationHotkey}
              onConfirm={assistant ? confirmAssistantHotkey : confirmDictationHotkey}
              dense={assistant}
            />
            {!assistant && (
              <div className="mx-auto mt-8 w-full max-w-md rounded-2xl border border-[var(--onboarding-control-border)] bg-[var(--onboarding-surface)] px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 text-start">
                    <p className="text-sm font-medium leading-5 text-[var(--onboarding-text-primary)]">
                      {t("onboarding.rehaul.dictationHotkey.activation")}
                    </p>
                    <p className="text-sm leading-5 text-[var(--onboarding-text-secondary)]">
                      {t(
                        activationMode === "push"
                          ? "onboarding.activation.holdDescription"
                          : "onboarding.activation.tapDescription"
                      )}
                    </p>
                  </div>
                  <ActivationModeSelector
                    variant="onboarding"
                    value={activationMode}
                    onChange={setActivationMode}
                    pushDisabledReason={pushToTalkUnavailableReason ?? undefined}
                  />
                </div>
                {pushToTalkUnavailableReason && !linuxInputAccessDenied && (
                  <p className="mt-2 text-start text-xs leading-[1.4] text-[var(--onboarding-text-secondary)]">
                    {pushToTalkUnavailableReason}
                  </p>
                )}
                {platform === "linux" && (activationMode === "push" || linuxInputAccessDenied) && (
                  <LinuxPttSetupInfo isAvailable={!linuxInputAccessDenied} />
                )}
              </div>
            )}
          </div>
        );
      }

      case "dictation-demo":
      case "assistant-demo": {
        const assistant = currentStepId === "assistant-demo";
        const scenario = resolveAssistantDemoScenario({
          calendarConnected: hasConnectedCalendar,
          screenContextActive,
        });
        const hotkeyInstruction = formatHotkeyInstruction(
          assistant ? assistantHotkey : dictationHotkey
        );
        const description = t(
          assistant
            ? `onboarding.rehaul.assistantDemo.scenarios.${scenario}.description`
            : activationMode === "push"
              ? "onboarding.activation.holdHotkey"
              : "onboarding.rehaul.dictationDemo.description",
          { hotkey: hotkeyInstruction }
        );
        return (
          <div className="h-full w-full pt-2">
            <OnboardingStepHeader
              title={t(
                assistant
                  ? "onboarding.rehaul.assistantDemo.title"
                  : "onboarding.rehaul.dictationDemo.title"
              )}
              titleLines={
                assistant
                  ? undefined
                  : [
                      t("onboarding.rehaul.dictationDemo.titleLineOne"),
                      t("onboarding.rehaul.dictationDemo.titleLineTwo"),
                    ]
              }
              wideTitle={assistant}
              description={<DemoHotkeyDescription text={description} hotkey={hotkeyInstruction} />}
            />
            <DemoStep
              kind={assistant ? "assistant" : "dictation"}
              initialSuccessful={assistant ? assistantDemoSuccess : dictationDemoSuccess}
              firstMessage={t(
                assistant
                  ? "onboarding.rehaul.assistantDemo.email.body"
                  : "onboarding.rehaul.dictationDemo.founder"
              )}
              secondMessage={t(
                assistant
                  ? `onboarding.rehaul.assistantDemo.scenarios.${scenario}.prompt`
                  : "onboarding.rehaul.dictationDemo.prompt"
              )}
              placeholder={t("onboarding.rehaul.dictationDemo.placeholder")}
              listeningLabel={t("onboarding.rehaul.demo.listening")}
              processingLabel={t("onboarding.rehaul.demo.processing")}
              stopLabel={t("onboarding.rehaul.demo.stop")}
              retryLabel={t("common.retry")}
              onSuccessChange={assistant ? setAssistantDemoSuccess : setDictationDemoSuccess}
            />
          </div>
        );
      }

      case "setup-choice":
        return (
          <div className="h-full w-full pt-2">
            <OnboardingStepHeader
              title={t("onboarding.rehaul.setupChoice.title")}
              titleLines={[
                t("onboarding.rehaul.setupChoice.titleLineOne"),
                t("onboarding.rehaul.setupChoice.titleLineTwo"),
              ]}
              description={t("onboarding.rehaul.setupChoice.description")}
            />
            <SetupChoiceStep
              agentAllowed={agentAllowed}
              onSelect={(mode, options) => void handleSetupSelection(mode, options)}
            />
          </div>
        );

      case "byok-dictation":
      case "byok-assistant":
        return (
          <div className="h-full w-full pt-2">
            <div>
              <OnboardingStepHeader
                title={t("onboarding.rehaul.provider.title")}
                description={t("onboarding.rehaul.provider.description")}
                descriptionLines={[
                  t("onboarding.rehaul.provider.descriptionLineOne"),
                  t("onboarding.rehaul.provider.descriptionLineTwo"),
                ]}
                wideTitle
              />
            </div>
            <ByokProviderStep
              key={currentStepId}
              stepId={currentStepId}
              selfHostedRequested={session.selfHostedRequested}
              onSelfHostedChange={setSelfHostedRequested}
              onConnectionChange={setStageReady}
              onProceed={() => void continueFromCurrentStep()}
              resumeState={session.resume.byok[currentStepId]}
              onResumeStateChange={updateCurrentByokDraft}
            />
          </div>
        );

      case "local-dictation":
      case "local-assistant":
        return (
          <div className="h-full w-full pt-2">
            <OnboardingStepHeader
              title={t("onboarding.rehaul.local.title")}
              wideTitle
              description={t("onboarding.rehaul.local.description")}
              descriptionLines={[
                t("onboarding.rehaul.local.descriptionLineOne"),
                t("onboarding.rehaul.local.descriptionLineTwo"),
              ]}
            />
            <LocalModelSetupStep
              key={currentStepId}
              stepId={currentStepId}
              onReadinessChange={setStageReady}
              onProceed={() => void continueFromCurrentStep()}
              onSkip={() => void skipLocalSetup()}
              resumeState={session.resume.localModels[currentStepId]}
              onResumeStateChange={updateCurrentLocalModelDraft}
            />
          </div>
        );
    }
  };

  const hasShellNavigation = !compact;
  const hotkeyStep = currentStepId === "dictation-hotkey" || currentStepId === "assistant-hotkey";
  const demoStep = currentStepId === "dictation-demo" || currentStepId === "assistant-demo";
  const inlineGatedStep = hotkeyStep || demoStep;
  const choiceStep = currentStepId === "setup-choice";
  const inlineProviderStep =
    currentStepId === "byok-dictation" ||
    currentStepId === "byok-assistant" ||
    currentStepId === "local-dictation" ||
    currentStepId === "local-assistant";
  const showsContinue =
    hasShellNavigation &&
    !choiceStep &&
    !inlineProviderStep &&
    (!inlineGatedStep || canContinue || setupDecisionPending);
  const showsSkip = !setupDecisionPending && demoStep && !canContinue;

  return (
    <>
      <OnboardingShell
        compact={compact}
        stepKey={currentStepId}
        onBack={
          hasShellNavigation && session.history.length > 0 && currentStepId !== "required-models"
            ? goBack
            : undefined
        }
        onContinue={showsContinue ? () => void continueFromCurrentStep() : undefined}
        onSkip={showsSkip ? () => void continueFromCurrentStep() : undefined}
        continueLabel={
          currentStepId === "use-cases"
            ? t("onboarding.useCase.proceedToSetup")
            : t("common.continue")
        }
        skipLabel={t("common.skip")}
        continueDisabled={!canContinue}
        continueLoading={isFinishing || isRegistering || setupDecisionPending}
        progress={getOnboardingProgress(currentStepId, route)}
        showBackLabel={!showsContinue && !showsSkip}
      >
        {fatalError && (
          <div
            role="alert"
            className="fixed left-1/2 top-14 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-destructive/20 bg-card px-4 py-2 text-sm text-destructive shadow-lg"
          >
            <AlertCircle className="size-4" />
            {fatalError}
          </div>
        )}
        {renderStep()}
      </OnboardingShell>

      <AlertDialog
        open={permissionAlert !== null}
        onOpenChange={(open) => !open && setPermissionAlert(null)}
        title={permissionAlert?.title ?? ""}
        description={permissionAlert?.description}
        onOk={() => setPermissionAlert(null)}
      />
    </>
  );
}
