import { reasoningModelBelongsToProvider, type ResolvedLLMConfig } from "../stores/settingsStore";
import { isProviderValidForMode } from "../models/ModelRegistry";
import type { InferenceMode } from "../types/electron";

type LLMConfigPatch = Partial<Omit<ResolvedLLMConfig, "scope">>;

export function modeSwitchPatch(
  current: Pick<ResolvedLLMConfig, "provider" | "model">,
  mode: InferenceMode
): LLMConfigPatch {
  const patch: LLMConfigPatch = {
    mode,
    cloudMode: "byok",
  };
  if (!isProviderValidForMode(current.provider, mode)) {
    patch.provider = "";
    patch.model = "";
  } else if (
    mode === "providers" &&
    !reasoningModelBelongsToProvider(current.provider, current.model)
  ) {
    patch.model = "";
  }
  return patch;
}
