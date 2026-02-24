import type { ApiEndpointBuilder } from './apiBuilderType';

export interface SearchUser {
  id: string;
  email: string;
  nickname: string | null;
  avatarPath: string | null;
}

export function getUsersEndpoints(builder: ApiEndpointBuilder) {
  return {
    updateProfile: builder.mutation<{ nickname: string | null }, { nickname: string | null }>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    uploadAvatar: builder.mutation<{ avatarPath: string }, FormData>({
      query: (formData) => ({ url: '/users/me/avatar', method: 'POST', body: formData }),
      invalidatesTags: ['User'],
    }),
    searchUsers: builder.query<SearchUser[], { q: string; limit?: number; offset?: number }>({
      query: ({ q, limit = 10, offset = 0 }) =>
        `/users/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`,
    }),
  };
}
