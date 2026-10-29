// Map a reasoning cloud routing to the InferenceMode its Settings tab selects on.
// Mirrors deriveTranscriptionMode (byok custom → self-hosted, other cloud → providers).
export function deriveReasoningMode(cloudMode, provider) {
  if (cloudMode === "byok") {
    return provider === "custom" ? "self-hosted" : "providers";
  }
  return provider === "custom" ? "self-hosted" : "providers";
}

// Whether a scope may borrow the fallback scope's API key along with its endpoint.
export function inheritsFallbackEndpoint(own, fallbackMode) {
  if (own.cloudBaseUrl || own.remoteUrl) return false;
  return !!fallbackMode && own.mode === fallbackMode;
}

const MIRRORED_ROUTING_FIELDS = [
  ["cleanupProvider", "provider"],
  ["cleanupModel", "model"],
  ["cleanupCloudMode", "cloudMode"],
  ["cleanupCloudBaseUrl", "cloudBaseUrl"],
  ["cleanupRemoteUrl", "remoteUrl"],
  ["cleanupCustomApiKey", "customApiKey"],
];

export function buildReasoningScopePatches(settings, mode) {
  const dictationCleanup = { ...settings, cleanupMode: mode };
  const routing = Object.fromEntries(
    MIRRORED_ROUTING_FIELDS.filter(([cleanupKey]) => settings[cleanupKey] !== undefined).map(
      ([cleanupKey, field]) => [field, settings[cleanupKey]]
    )
  );
  return {
    dictationCleanup,
    noteFormatting: { mode, ...routing },
    dictationAgent: { mode, ...routing },
    chatIntelligence: { mode, ...routing },
    dictationTranslation: { mode, ...routing },
  };
}

export function buildCortiOnboardingPayloads(
  transcriptionProvider,
  reasoningProvider,
  environment,
  hasApiKey
) {
  const transcription = {
    useLocalWhisper: false,
    cloudTranscriptionMode: "byok",
    cloudTranscriptionProvider: "corti",
    cloudTranscriptionModel: transcriptionProvider?.models?.[0]?.id,
  };
  const cortiModel = reasoningProvider?.models?.[0]?.id;
  const reasoning =
    environment === "eu" && hasApiKey && cortiModel
      ? {
          useCleanupModel: true,
          cleanupProvider: "corti",
          cleanupModel: cortiModel,
          cleanupCloudMode: "byok",
        }
      : { useCleanupModel: true, cleanupCloudMode: "byok" };
  return { transcription, reasoning };
}

export function isSelfHostedLLM(settings) {
  return settings.cleanupMode === "self-hosted" && !!(settings.remoteLLMUrl || "").trim();
}

export function resolveSelfHostedLLMModel(settings) {
  const model = (settings.remoteLLMModel || "").trim();
  return model || "default";
}

export function resolveReasoningMode(settings) {
  if (!settings.useCleanupModel) {
    return { mode: "none" };
  }
  if (isSelfHostedLLM(settings)) {
    return { mode: "self-hosted" };
  }
  return { mode: "byok" };
}
