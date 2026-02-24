export interface AuthRegisterRequest {
  email: string;
  nickname: string;
  password: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  expiresIn: number;
}
