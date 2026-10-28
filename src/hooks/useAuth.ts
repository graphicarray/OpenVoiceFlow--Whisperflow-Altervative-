export function useAuth() {
  return {
    isSignedIn: false,
    isGracePeriodOnly: false,
    isLoaded: true,
    session: null as null,
    user: null as { id?: string; name?: string; email?: string; image?: string | null } | null,
    refetch: async () => null,
  };
}
