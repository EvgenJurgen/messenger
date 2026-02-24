/**
 * Base URL for backend (API and static files). Empty string = same origin.
 * Set VITE_API_URL in .env when frontend and backend are on different origins.
 */
const API_ORIGIN =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
    : '';

/** Returns full URL for an avatar image, or null if no path. */
export function getAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath || typeof avatarPath !== 'string') return null;
  return `${API_ORIGIN}/uploads/avatars/${avatarPath}`;
}
