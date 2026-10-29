export const API_URL = "";

export interface DataWrap<T> {
  data: T;
}

export interface CloudResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  code?: string;
}

export class CloudApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(message: string, status = 0, code?: string, details?: unknown) {
    super(message);
    this.name = "CloudApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class CloudAccountContextChangedError extends Error {
  code = "ACCOUNT_CONTEXT_CHANGED";
  constructor(message = "Account context changed") {
    super(message);
    this.name = "CloudAccountContextChangedError";
  }
}

export function isAccountContextChangedError(err: unknown): err is CloudAccountContextChangedError {
  return err instanceof CloudAccountContextChangedError;
}

export function isAuthContextError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === "AUTH_CONTEXT_CHANGED" || code === "AUTH_CONTEXT_UNVALIDATED";
}

export async function cloudFetch<T = unknown>(
  _path: string,
  _options?: { method?: string; body?: unknown }
): Promise<CloudResponse<T>> {
  return { ok: false, status: 0, data: null as unknown as T, code: "OFFLINE" };
}

export async function cloudGet<T = unknown>(_path: string): Promise<T> {
  return {} as T;
}

export async function cloudGetForAuthGeneration<T = unknown>(
  _path: string,
  _authGeneration: number
): Promise<T> {
  return {} as T;
}

export async function cloudGetForAuthValidation<T = unknown>(
  _path: string,
  _generation: number
): Promise<T> {
  return {} as T;
}

export async function cloudGetPublic<T = unknown>(_path: string): Promise<T> {
  return {} as T;
}

export async function cloudPost<T = unknown>(_path: string, _body?: unknown): Promise<T> {
  return {} as T;
}

export async function cloudPostForAuthGeneration<T = unknown>(
  _path: string,
  _body: unknown,
  _authGeneration: number
): Promise<T> {
  return {} as T;
}

export async function cloudPatch<T = unknown>(_path: string, _body?: unknown): Promise<T> {
  return {} as T;
}

export async function cloudPatchForAuthGeneration<T = unknown>(
  _path: string,
  _body: unknown,
  _authGeneration: number
): Promise<T> {
  return {} as T;
}

export async function cloudPut<T = unknown>(_path: string, _body?: unknown): Promise<T> {
  return {} as T;
}

export async function cloudDelete<T = unknown>(_path: string, _body?: unknown): Promise<T> {
  return {} as T;
}

export async function cloudDeleteForAuthGeneration<T = unknown>(
  _path: string,
  _body: unknown,
  _authGeneration: number
): Promise<T> {
  return {} as T;
}
