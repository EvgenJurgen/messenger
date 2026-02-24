/**
 * API error with errorKey (i18n) and errorMessage (fallback from backend).
 * Thrown by request() and used when parsing RTK Query errors.
 */
export class ApiError extends Error {
  readonly errorKey: string;
  readonly errorMessage: string;

  constructor(message: string, errorKey: string, errorMessage: string) {
    super(message);
    this.name = 'ApiError';
    this.errorKey = errorKey;
    this.errorMessage = errorMessage;
  }

  /**
   * Display text: use t(errorKey) if translated, else errorMessage.
   * Handles ApiError and RTK Query FetchBaseQueryError (data.errorKey / data.errorMessage).
   */
  static getDisplayText(
    err: unknown,
    t: (key: string) => string,
    fallbackKey: string,
  ): string {
    if (err instanceof ApiError) {
      const translated = t(err.errorKey);
      return translated !== err.errorKey ? translated : err.errorMessage;
    }
    const rtkData = getRtkErrorData(err);
    if (rtkData?.errorKey) {
      const translated = t(rtkData.errorKey);
      return translated !== rtkData.errorKey
        ? translated
        : (rtkData.errorMessage ?? t(fallbackKey));
    }
    if (rtkData?.errorMessage) return rtkData.errorMessage;
    if (err instanceof Error) return err.message;
    return t(fallbackKey);
  }
}

function getRtkErrorData(err: unknown): { errorKey?: string; errorMessage?: string } | null {
  if (!err || typeof err !== 'object' || !('data' in err)) return null;
  const d = (err as { data?: unknown }).data;
  return d && typeof d === 'object' && 'errorKey' in d ? (d as { errorKey?: string; errorMessage?: string }) : null;
}
