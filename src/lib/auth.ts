export const AUTH_URL = "";
export const ADMIN_URL = "";
export const authClient: null = null;

export type SocialProvider = "google" | "microsoft" | "apple";

export interface AuthActionError extends Error {
  code?: string;
}

export function updateLastSignInTime(): void {}

export function isWithinGracePeriod(): boolean {
  return false;
}

export function getGracePeriodRemainingMs(): number {
  return 0;
}

export async function signOut(): Promise<void> {}

export async function withSessionRefresh<T>(operation: () => Promise<T>): Promise<T> {
  return operation();
}

export async function signInWithSocial(_provider: SocialProvider): Promise<{ error?: Error }> {
  return {};
}

export async function signInWithSSO(_email: string): Promise<{ error?: Error }> {
  return {};
}

export async function requestPasswordReset(_email: string): Promise<{ error?: Error }> {
  return {};
}

export async function updateDisplayName(_name: string): Promise<{ error?: AuthActionError }> {
  return {};
}

export async function changePassword(_params: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions: boolean;
}): Promise<{ error?: AuthActionError }> {
  return {};
}

export async function openAdminConsole(): Promise<void> {}

export async function hasCredentialAccount(): Promise<boolean> {
  return false;
}
