export function useSignOut(_dialogs?: unknown): {
  requestSignOut: () => Promise<void>;
  isSigningOut: boolean;
} {
  return {
    requestSignOut: async () => {},
    isSigningOut: false,
  };
}
