import { createApi } from '@reduxjs/toolkit/query/react';

import { apiReducerPath } from './apiBuilderType';
import { baseQueryWithAuth } from './baseQuery';
import { getAuthEndpoints } from './authApi';
import { getChatsEndpoints } from './chatsApi';
import { getUsersEndpoints } from './usersApi';

/**
 * Base API: assembles all domain endpoints from authApi, usersApi, chatsApi.
 * Add a new domain: create api file with getXxxEndpoints(builder), import and merge here.
 */
export const baseApi = createApi({
  reducerPath: apiReducerPath,
  baseQuery: baseQueryWithAuth,
  tagTypes: ['User', 'Conversations', 'Messages'],
  endpoints: (builder) => ({
    ...getAuthEndpoints(builder),
    ...getUsersEndpoints(builder),
    ...getChatsEndpoints(builder),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useLazyGetMessagesQuery,
  useGetOrCreateConversationMutation,
  useLoginMutation,
  useLazyMeQuery,
  useLazySearchUsersQuery,
  useRegisterMutation,
  useSendMessageMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} = baseApi;
