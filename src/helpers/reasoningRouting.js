function isSelfHostedLLM(settings) {
  return settings.cleanupMode === "self-hosted" && !!(settings.remoteLLMUrl || "").trim();
}

function resolveSelfHostedLLMModel(settings) {
  const model = (settings.remoteLLMModel || "").trim();
  return model || "default";
}

function resolveReasoningMode(settings) {
  if (!settings.useCleanupModel) {
    return { mode: "none" };
  }
  if (isSelfHostedLLM(settings)) {
    return { mode: "self-hosted" };
  }
  return { mode: "byok" };
}

export { isSelfHostedLLM, resolveSelfHostedLLMModel, resolveReasoningMode };
