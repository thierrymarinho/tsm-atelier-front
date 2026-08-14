const BASE_URL = "/api";

const DEFAULT_TIMEOUT_MS = 30_000;

const SKIP_REFRESH_PATHS = [
  "/v1/auth/refresh",
  "/v1/auth/login",
  "/v1/auth/register",
  "/v1/auth/verify-email",
];

const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

const CSRF_HEADER = "X-XSRF-TOKEN";

const CSRF_COOKIE = "__Host-XSRF-TOKEN";

const CSRF_COOKIE_LEGACY = "XSRF-TOKEN";

const CSRF_PRIMING_PATH = "/v1/catalog/products?size=1";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function readCsrfToken(): string | null {
  return readCookie(CSRF_COOKIE) ?? readCookie(CSRF_COOKIE_LEGACY);
}

let csrfPriming: Promise<void> | null = null;

async function ensureCsrfToken(): Promise<string | null> {
  const existing = readCsrfToken();
  if (existing) return existing;

  csrfPriming ??= fetch(`${BASE_URL}${CSRF_PRIMING_PATH}`, {
    method: "GET",
    credentials: "same-origin",
  })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      csrfPriming = null;
    });

  await csrfPriming;
  return readCsrfToken();
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface ApiRequestConfig {
  params?: QueryParams;
  signal?: AbortSignal;
  timeout?: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export class ApiError<T = unknown> extends Error {
  readonly response?: { status: number; data: T; headers: Headers };

  constructor(message: string, response?: { status: number; data: T; headers: Headers }) {
    super(message);
    this.name = "ApiError";
    this.response = response;
  }

  get isSecurityRevocation(): boolean {
    const data = this.response?.data as { detail?: unknown } | null | undefined;
    return typeof data?.detail === "string" && data.detail.startsWith("Security Alert");
  }
}

function buildUrl(path: string, params?: QueryParams): string {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) search.set(key, String(value));
    }
  }
  const query = search.toString();
  return `${BASE_URL}${path}${query ? `?${query}` : ""}`;
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const essence = contentType.split(";")[0].trim().toLowerCase();
  return essence === "application/json" || essence.endsWith("+json");
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  if (isJsonContentType(res.headers.get("content-type"))) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function resolveSignal(config?: ApiRequestConfig): AbortSignal {
  const timeout = AbortSignal.timeout(config?.timeout ?? DEFAULT_TIMEOUT_MS);
  if (!config?.signal) return timeout;
  return AbortSignal.any ? AbortSignal.any([config.signal, timeout]) : config.signal;
}

export type SessionExpiryReason = "expired" | "revoked";

type SessionExpiredListener = (reason: SessionExpiryReason) => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

function notifySessionExpired(reason: SessionExpiryReason) {
  for (const listener of sessionExpiredListeners) {
    try {
      listener(reason);
    } catch (listenerError) {
      console.error("onSessionExpired listener threw", listenerError);
    }
  }
}

let isRefreshing = false;
let waiters: Array<{ resolve: () => void; reject: (reason: unknown) => void }> = [];

function flushWaiters(error: unknown) {
  const pending = waiters;
  waiters = [];
  for (const waiter of pending) {
    if (error) waiter.reject(error);
    else waiter.resolve();
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  config?: ApiRequestConfig,
  isRetry = false,
): Promise<ApiResponse<T>> {
  const headers = new Headers();
  const hasBody = body !== undefined && body !== null;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (hasBody && !isFormData) headers.set("Content-Type", "application/json");

  if (!CSRF_SAFE_METHODS.has(method)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) headers.set(CSRF_HEADER, csrfToken);
  }

  const res = await fetch(buildUrl(path, config?.params), {
    method,
    headers,
    body: hasBody ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
    credentials: "same-origin",
    signal: resolveSignal(config),
  });

  const payload = await parseBody(res);

  if (res.ok) {
    return { data: payload as T, status: res.status, headers: res.headers };
  }

  const error = new ApiError(`Request failed with status ${res.status}`, {
    status: res.status,
    data: payload,
    headers: res.headers,
  });

  const shouldTryRefresh =
    res.status === 401 && !isRetry && !SKIP_REFRESH_PATHS.some((p) => path.includes(p));

  if (!shouldTryRefresh) throw error;

  if (isRefreshing) {
    try {
      await new Promise<void>((resolve, reject) => waiters.push({ resolve, reject }));
    } catch {
      throw error;
    }
    return request<T>(method, path, body, config, true);
  }

  isRefreshing = true;
  try {
    await request("POST", "/v1/auth/refresh", undefined, undefined, true);
    flushWaiters(null);
  } catch (refreshError) {
    flushWaiters(refreshError);
    notifySessionExpired(
      refreshError instanceof ApiError && refreshError.isSecurityRevocation
        ? "revoked"
        : "expired",
    );
    throw error;
  } finally {
    isRefreshing = false;
  }

  return request<T>(method, path, body, config, true);
}

export const apiClient = {
  get: <T = unknown>(path: string, config?: ApiRequestConfig) =>
    request<T>("GET", path, undefined, config),

  post: <T = unknown>(path: string, body?: unknown, config?: ApiRequestConfig) =>
    request<T>("POST", path, body, config),

  put: <T = unknown>(path: string, body?: unknown, config?: ApiRequestConfig) =>
    request<T>("PUT", path, body, config),

  patch: <T = unknown>(path: string, body?: unknown, config?: ApiRequestConfig) =>
    request<T>("PATCH", path, body, config),

  delete: <T = unknown>(path: string, config?: ApiRequestConfig) =>
    request<T>("DELETE", path, undefined, config),
};
