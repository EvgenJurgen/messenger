import type { User } from '@/entities/user';

import type { ApiEndpointBuilder } from './apiBuilderType';

export interface AuthTokensResponse {
  accessToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  nickname: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export function getAuthEndpoints(builder: ApiEndpointBuilder) {
  return {
    register: builder.mutation<AuthTokensResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    login: builder.mutation<AuthTokensResponse, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    me: builder.query<User, void>({
      query: () => ({ url: '/auth/me' }),
      providesTags: ['User'],
    }),
  };
}
