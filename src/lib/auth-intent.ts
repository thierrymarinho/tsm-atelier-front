const AUTH_INTENT_KEY = "tsm_auth_intent";

const AUTH_INTENT_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredAuthIntent {
  path: string;
  savedAt: number;
}

function isSafeInternalPath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

export function rememberAuthIntent(path: string): void {
  if (typeof window === "undefined" || !isSafeInternalPath(path)) return;

  const intent: StoredAuthIntent = { path, savedAt: Date.now() };
  try {
    localStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(intent));
  } catch (error) {
    console.warn("Failed to store auth intent", error);
  }
}

export function consumeAuthIntent(): string | null {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(AUTH_INTENT_KEY);
    localStorage.removeItem(AUTH_INTENT_KEY);
  } catch (error) {
    console.warn("Failed to read auth intent", error);
    return null;
  }

  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return null;

    const { path, savedAt } = parsed as StoredAuthIntent;
    if (!isSafeInternalPath(path) || typeof savedAt !== "number") return null;
    if (Date.now() - savedAt > AUTH_INTENT_TTL_MS) return null;

    return path;
  } catch (error) {
    console.warn("Failed to parse auth intent", error);
    return null;
  }
}
