/**
 * Default English messages for error keys.
 * Used when building API error responses; keys are for i18n, messages are fallback.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  'errors.invalid_email': 'Invalid email address',
  'errors.password_min_length': 'Password must be at least 8 characters',
  'errors.password_max_length': 'Password must not exceed 64 characters',
  'errors.password_format': 'Password must contain uppercase, lowercase and a digit',
  'errors.password_required': 'Password is required',
  'auth.email_already_registered': 'User with this email is already registered',
  'auth.nickname_already_taken': 'This nickname is already taken',
  'auth.invalid_credentials': 'Invalid email or password',
  'auth.unauthorized': 'Unauthorized',
  'errors.nickname_min_length': 'Nickname must be at least 1 character',
  'errors.nickname_max_length': 'Nickname must not exceed 64 characters',
  'error.generic': 'Something went wrong',
  'profile.avatar_required': 'Please select an image file',
  'profile.avatar_too_large': 'Image must be 20 MB or smaller',
  'profile.avatar_invalid_type': 'Only JPEG, PNG, GIF and WebP images are allowed',
} as const;

export const ERROR_KEYS = {
  AUTH_EMAIL_ALREADY_REGISTERED: 'auth.email_already_registered',
  AUTH_NICKNAME_ALREADY_TAKEN: 'auth.nickname_already_taken',
  AUTH_INVALID_CREDENTIALS: 'auth.invalid_credentials',
  AUTH_UNAUTHORIZED: 'auth.unauthorized',
  ERROR_GENERIC: 'error.generic',
  PROFILE_AVATAR_REQUIRED: 'profile.avatar_required',
  PROFILE_AVATAR_TOO_LARGE: 'profile.avatar_too_large',
  PROFILE_AVATAR_INVALID_TYPE: 'profile.avatar_invalid_type',
} as const;

export function getErrorMessage(key: string): string {
  return ERROR_MESSAGES[key as keyof typeof ERROR_MESSAGES] ?? key;
}
