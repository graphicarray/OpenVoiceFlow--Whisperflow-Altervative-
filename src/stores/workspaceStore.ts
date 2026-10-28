import { create } from "zustand";
import type { Workspace, WorkspaceMember } from "../types/electron";

interface WorkspaceState {
  workspaces: Workspace[];
  loaded: boolean;
  loading: boolean;
  error: boolean;
  activeWorkspaceId: string | null;
  members: WorkspaceMember[];
  setActiveWorkspaceId: (id: string | null) => void;
  resetForAccountChange: () => void;
  refresh: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  refreshMembers: (workspaceId: string) => Promise<void>;
}

export const ACTIVE_WORKSPACE_KEY = "activeWorkspaceId";

export function refreshManagedEnterpriseIdentity(
  _accountId?: string | null,
  _authGeneration?: number | null,
  _workspaceId?: string | null
): void {}

export const useWorkspaceStore = create<WorkspaceState>(() => ({
  workspaces: [],
  loaded: true,
  loading: false,
  error: false,
  activeWorkspaceId: null,
  members: [],
  setActiveWorkspaceId: () => {},
  resetForAccountChange: () => {},
  refresh: async () => {},
  createWorkspace: async (name: string) => ({
    id: "local",
    name,
    role: "owner",
    created_at: new Date().toISOString(),
  } as Workspace),
  refreshMembers: async () => {},
}));
