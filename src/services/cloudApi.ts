export const API_URL = "";

export interface CloudResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  code?: string;
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

export async function cloudFetch<T = unknown>(
  _path: string,
  _options?: { method?: string; body?: unknown }
): Promise<CloudResponse<T>> {
  return { ok: false, status: 0, data: null as unknown as T, code: "OFFLINE" };
}

export async function cloudGet<T = unknown>(_path: string): Promise<CloudResponse<T>> {
  return { ok: false, status: 0, data: null as unknown as T, code: "OFFLINE" };
}

export async function cloudPost<T = unknown>(
  _path: string,
  _body?: unknown
): Promise<CloudResponse<T>> {
  return { ok: false, status: 0, data: null as unknown as T, code: "OFFLINE" };
}

export async function cloudPatch<T = unknown>(
  _path: string,
  _body?: unknown
): Promise<CloudResponse<T>> {
  return { ok: false, status: 0, data: null as unknown as T, code: "OFFLINE" };
}

export async function cloudPut<T = unknown>(
  _path: string,
  _body?: unknown
): Promise<CloudResponse<T>> {
  return { ok: false, status: 0, data: null as unknown as T, code: "OFFLINE" };
}

export async function cloudDelete<T = unknown>(_path: string): Promise<CloudResponse<T>> {
  return { ok: false, status: 0, data: null as unknown as T, code: "OFFLINE" };
}
