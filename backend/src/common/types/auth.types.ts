/** JWT payload (sub = user id). */
export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

/** Token pair returned by auth service. */
export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

/** User info attached to request after JWT validation. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  avatarPath: string | null;
  nickname: string | null;
}
