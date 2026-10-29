export type SyncTriggerReason =
  | "start"
  | "startup"
  | "interval"
  | "focus"
  | "online"
  | "manual"
  | "team-push"
  | "retry"
  | "mutation"
  | "preference-change";

export async function markSpacePurged(
  _cloudSpaceId: string,
  _reason?: string
): Promise<void> {}

export async function upsertCloudSpaces(_cloudSpaces: unknown[]): Promise<number[]> {
  return [];
}

export class SyncService {
  canSync(): boolean {
    return false;
  }
  start(): void {}
  stop(): void {}
  startAutoSync(): void {}
  setNoteOpen(_open: boolean): void {}
  syncAll(_waitForLock = false): Promise<void> {
    return Promise.resolve();
  }
  syncNow(): Promise<void> {
    return Promise.resolve();
  }
  requestSyncAll(_reason?: SyncTriggerReason): void {}
  debouncedPush(_entityType: string, _entityId: number): void {}
  syncDictionaryNow(): Promise<void> {
    return Promise.resolve();
  }
  syncSnippetsNow(): Promise<void> {
    return Promise.resolve();
  }
  syncAnalyticsNow(): Promise<boolean> {
    return Promise.resolve(false);
  }
  ensureNoteSynced(_localId: number): Promise<string | null> {
    return Promise.resolve(null);
  }
  verifyTeamSpacesForAccount(_authGeneration: number): Promise<number> {
    return Promise.resolve(0);
  }
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
  purgeTeamSpacesForSignOut(): Promise<void> {
    return Promise.resolve();
  }
  pullPreferencesOnStartup(): Promise<void> {
    return Promise.resolve();
  }
  pushNoteNow(_note: unknown): Promise<void> {
    return Promise.resolve();
  }
  deleteNoteNow(
    _cloudId: string,
    _spaceId?: number | null
  ): Promise<"deleted" | "forbidden" | "retry"> {
    return Promise.resolve("deleted");
  }
  pushFolderNow(_folder: unknown): Promise<void> {
    return Promise.resolve();
  }
  deleteFolderNow(
    _cloudId: string,
    _spaceId?: number | null
  ): Promise<"deleted" | "forbidden" | "retry"> {
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
