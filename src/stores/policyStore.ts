import { create } from "zustand";
import type { OrgPolicy } from "../types/policy";
import type { PolicyDecisionSnapshot } from "./policyRules";

export interface PolicyState extends PolicyDecisionSnapshot {
  accountId: string | null;
  authGeneration: number | null;
  revision: number;
  managed: boolean;
  fetchPolicy: (accountId: string, authGeneration: number) => Promise<void>;
  clearPolicy: () => void;
  suspendPolicy: () => void;
}

export const usePolicyStore = create<PolicyState>()((set) => ({
  accountId: null,
  authGeneration: null,
  revision: 0,
  status: "unmanaged",
  managed: false,
  policy: null as OrgPolicy | null,
  appVersion: null,
  fetchPolicy: async (_accountId: string, _authGeneration: number): Promise<void> => {
    set({
      accountId: null,
      authGeneration: null,
      status: "unmanaged",
      managed: false,
      policy: null,
    });
  },
  clearPolicy: (): void => {
    set({
      accountId: null,
      authGeneration: null,
      revision: 0,
      status: "unmanaged",
      managed: false,
      policy: null,
      appVersion: null,
    });
  },
  suspendPolicy: (): void => {
    set({
      accountId: null,
      authGeneration: null,
      revision: 0,
      status: "unmanaged",
      managed: false,
      policy: null,
      appVersion: null,
    });
  },
}));
