import { productHelpTools } from "./productHelpTools";
import { ToolRegistry } from "./ToolRegistry";
import { clipboardTool } from "./clipboardTool";
import { createSnippetTool, createUpdateSnippetsTool, type SnippetActions } from "./snippetTool";
import { createUpdateDictionaryTool, type DictionaryActions } from "./dictionaryTool";
import type { ConnectorToolSettings } from "./connectors/connectorToolModules";
import type { ContainerScope } from "../../types/chat";

export { ToolRegistry } from "./ToolRegistry";
export type { ToolDefinition, ToolResult } from "./ToolRegistry";

interface ToolRegistrySettings {
  isSignedIn: boolean;
  productHelpEnabled?: boolean;
  calendarConnected: boolean;
  cloudBackupEnabled: boolean;
  searchScope?: ContainerScope;
  webSearchEnabled: boolean;
  vocabulary?: DictionaryActions & SnippetActions;
  connectors?: ConnectorToolSettings;
  keepNotesUnchanged?: boolean;
}

export function createToolRegistry(settings: ToolRegistrySettings): ToolRegistry {
  const registry = new ToolRegistry();
  if (settings.productHelpEnabled !== false)
    for (const tool of productHelpTools) registry.register(tool);

  registry.register(clipboardTool);

  if (settings.vocabulary) {
    const snippets = settings.vocabulary.getSnippets();
    if (snippets.length > 0) registry.register(createSnippetTool(snippets));
    registry.register(createUpdateDictionaryTool(settings.vocabulary));
    registry.register(createUpdateSnippetsTool(settings.vocabulary));
  }

  return registry;
}
