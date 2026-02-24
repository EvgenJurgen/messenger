import type { EndpointBuilder } from '@reduxjs/toolkit/query';

import type { baseQueryWithAuth } from './baseQuery';

export const apiReducerPath = 'api' as const;
export type ApiTagTypes = 'User' | 'Conversations' | 'Messages';

export type ApiEndpointBuilder = EndpointBuilder<
  typeof baseQueryWithAuth,
  ApiTagTypes,
  typeof apiReducerPath
>;
