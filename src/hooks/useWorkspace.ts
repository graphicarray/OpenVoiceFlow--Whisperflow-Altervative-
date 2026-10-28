import type { Workspace, WorkspaceRole } from "../types/electron";

interface UseWorkspaceResult {
  workspaces: Workspace[];
  active: Workspace | null;
  role: WorkspaceRole | null;
  loaded: boolean;
  setActive: (id: string | null) => void;
  refresh: () => Promise<void>;
}

export function useWorkspace(): UseWorkspaceResult {
  return {
    workspaces: [],
    active: null,
    role: null,
    loaded: true,
    setActive: () => {},
    refresh: async () => {},
  };
}
