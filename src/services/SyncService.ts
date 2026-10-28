export type SyncTriggerReason =
  | "startup"
  | "interval"
  | "focus"
  | "online"
  | "manual"
  | "mutation"
  | "preference-change";

class SyncService {
  start(): void {}
  stop(): void {}
  syncNow(): Promise<void> {
    return Promise.resolve();
  }
  requestSyncAll(_reason?: SyncTriggerReason): void {}
  syncSpaces(): Promise<boolean> {
    return Promise.resolve(true);
  }
  syncTeamNotesAndFolders(): Promise<void> {
    return Promise.resolve();
  }
  syncPreferences(): Promise<void> {
    return Promise.resolve();
  }
  pushPreferencesNow(): Promise<void> {
    return Promise.resolve();
  }
  syncAnalyticsEvents(): Promise<boolean> {
    return Promise.resolve(true);
  }
  flushAnalyticsBeforeSignOut(): Promise<boolean> {
    return Promise.resolve(true);
  }
  purgeTeamSpacesForSignOut(): Promise<{ purgedSpaceIds: number[]; failedSpaceIds: number[] }> {
    return Promise.resolve({ purgedSpaceIds: [], failedSpaceIds: [] });
  }
  pullPreferencesOnStartup(): Promise<void> {
    return Promise.resolve();
  }
  pushNoteNow(_note: unknown): Promise<void> {
    return Promise.resolve();
  }
  deleteNoteNow(_cloudId: string, _spaceId?: number | null): Promise<"deleted" | "forbidden" | "retry"> {
    return Promise.resolve("deleted");
  }
  pushFolderNow(_folder: unknown): Promise<void> {
    return Promise.resolve();
  }
  deleteFolderNow(_cloudId: string, _spaceId?: number | null): Promise<"deleted" | "forbidden" | "retry"> {
    return Promise.resolve("deleted");
  }
  deleteTranscriptionNow(_cloudId: string): void {}
  clearTranscriptionsNow(_clearedBefore?: string): void {}
  deleteConversationNow(_cloudId: string): void {}
  pushDictionaryEntryNow(_word: string, _source?: string): void {}
  deleteDictionaryEntryNow(_cloudId: string): void {}
  pushSnippetNow(_trigger: string, _replacement: string): void {}
  deleteSnippetNow(_cloudId: string): void {}
  ensureFolderSynced(_localFolderId: number): Promise<string | null> {
    return Promise.resolve(null);
  }
}

export const syncService = new SyncService();
