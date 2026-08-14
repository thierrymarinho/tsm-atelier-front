import { translateApiError } from "./translations";

export function formatApiError(error: any, defaultMessage: string = "Ocorreu um erro."): string {
  if (!error?.response?.data) return defaultMessage;

  const data = error.response.data;

  if (data.violations && Array.isArray(data.violations)) {
    return data.violations.map((v: any) => translateApiError(v.message || v.defaultMessage)).join(" | ");
  }

  if (data.fields && typeof data.fields === 'object' && !Array.isArray(data.fields)) {
    return Object.values(data.fields).map((msg: any) => translateApiError(String(msg))).join(" | ");
  }

  if (data.errors && Array.isArray(data.errors)) {
    return data.errors.map((e: any) => translateApiError(e.defaultMessage || e.message || e)).join(" | ");
  }

  if (data.message && data.message !== "One or more fields are invalid.") {
    return translateApiError(data.message);
  }

  if (data.detail && data.detail !== "One or more fields are invalid.") {
    return translateApiError(data.detail);
  }

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      return translateApiError(data);
    }
    if (process.env.NODE_ENV !== "production") {
      console.debug("[formatApiError] JSON-looking string body, not surfaced:", trimmed);
    }
    return defaultMessage;
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[formatApiError] unrecognised API error shape:", data);
  }

  return defaultMessage;
}
