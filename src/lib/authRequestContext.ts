export interface AuthTokenState {
  hasSessionToken: boolean;
  sessionUserId: string | null;
  generation: number;
}

export interface AuthTokenStateEvent extends AuthTokenState {
  reason?: string;
}

export interface RendererAuthContextSnapshot {
  generation: number;
  sessionGeneration: number | null;
  sessionUserId: string | null;
  validatedGeneration: number | null;
  validatedUserId: string | null;
  revision: number;
}

export type AuthRequestContextSnapshot = RendererAuthContextSnapshot;

const SNAPSHOT: RendererAuthContextSnapshot = {
  generation: 0,
  sessionGeneration: null,
  sessionUserId: null,
  validatedGeneration: null,
  validatedUserId: null,
  revision: 0,
};

export function subscribeAuthRequestContext(_listener: () => void): () => void {
  return () => {};
}

export function getAuthRequestContextSnapshot(): RendererAuthContextSnapshot {
  return SNAPSHOT;
}

export function getAuthRequestContextServerSnapshot(): RendererAuthContextSnapshot {
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

export async function readAuthTokenState(): Promise<AuthTokenState> {
  return { hasSessionToken: false, sessionUserId: null, generation: 0 };
}

export async function assertAuthGenerationCurrent(_expectedGeneration: number): Promise<void> {}

export async function assertAuthRequestCurrent(_expectedGeneration?: number): Promise<void> {}

export function observeAuthTokenState(_state: unknown): void {}

export function observeAuthTokenStateEvent(_state: unknown): void {}

export function resetAuthRequestContextForTests(): void {}

export const authContextFetch = fetch;
export function prepareAuthRequest(): void {}
export function handleAuthRequestResponse(): void {}
export function handleAuthRequestSuccess(): void {}
export function handleAuthRequestError(): void {}
