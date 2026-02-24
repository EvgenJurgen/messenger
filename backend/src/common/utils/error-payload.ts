import type { ErrorResponseBody } from '../interfaces/error-response.interface.js';

/**
 * Builds a consistent API error payload (errorKey + errorMessage) for i18n and fallback display.
 */
export function errorPayload(errorKey: string, errorMessage: string): ErrorResponseBody {
  return { errorKey, errorMessage };
}
