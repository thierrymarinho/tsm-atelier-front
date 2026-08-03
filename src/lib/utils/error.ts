import { translateApiError } from "./translations";

export function formatApiError(error: any, defaultMessage: string = "Ocorreu um erro."): string {
  if (!error?.response?.data) return defaultMessage;

  const data = error.response.data;
  
  // Spring Boot ProblemDetail violations
  if (data.violations && Array.isArray(data.violations)) {
    return data.violations.map((v: any) => translateApiError(v.message || v.defaultMessage)).join(" | ");
  }

  // Object-based field errors (e.g. { fields: { "postalCode": "Invalid format" } })
  if (data.fields && typeof data.fields === 'object' && !Array.isArray(data.fields)) {
    return Object.values(data.fields).map((msg: any) => translateApiError(String(msg))).join(" | ");
  }

  // Standard Spring Boot errors array
  if (data.errors && Array.isArray(data.errors)) {
    return data.errors.map((e: any) => translateApiError(e.defaultMessage || e.message || e)).join(" | ");
  }
  
  // Spring message field
  if (data.message && data.message !== "One or more fields are invalid.") {
    return translateApiError(data.message);
  }

  // Generic detail
  if (data.detail && data.detail !== "One or more fields are invalid.") {
    return translateApiError(data.detail);
  }
  
  // As a fallback to debug what is actually returning, show stringified object
  // In production we would return defaultMessage, but let's see what the API gave us.
  return typeof data === 'object' ? JSON.stringify(data) : translateApiError(String(data));
}
