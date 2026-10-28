export interface AuthRequestContextSnapshot {
  generation: number;
  validatedGeneration: number | null;
  validatedUserId: string | null;
  revision: number;
}

const SNAPSHOT: AuthRequestContextSnapshot = {
  generation: 0,
  validatedGeneration: null,
  validatedUserId: null,
  revision: 0,
};

export function subscribeAuthRequestContext(_listener: () => void): () => void {
  return () => {};
}

export function getAuthRequestContextSnapshot(): AuthRequestContextSnapshot {
  return SNAPSHOT;
}

export function getAuthRequestContextServerSnapshot(): AuthRequestContextSnapshot {
  return SNAPSHOT;
}

export function getValidatedAuthGeneration(): number | null {
  return null;
}

export function hasValidatedAuthContext(): boolean {
  return false;
}

export function getBoundSessionGeneration(_userId: string | null): number | null {
  return null;
}

export function commitValidatedAuthContext(_generation: number, _userId: string): boolean {
  return false;
}

export function invalidateValidatedAuthContext(): void {}

export async function readAuthTokenState(): Promise<void> {}

export async function assertAuthGenerationCurrent(_expectedGeneration: number): Promise<void> {}

export function observeAuthTokenStateEvent(_state: unknown): void {}

export const authContextFetch = fetch;
export function prepareAuthRequest(): void {}
export function handleAuthRequestResponse(): void {}
export function handleAuthRequestSuccess(): void {}
export function handleAuthRequestError(): void {}
