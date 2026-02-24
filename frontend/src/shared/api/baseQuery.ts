import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE = '/api';

type BaseQueryArg = string | { url: string; method?: string; body?: unknown };

export const baseQueryWithAuth = async (args: unknown, api: unknown, extraOptions: unknown) => {
  const raw = args as BaseQueryArg;
  const req = typeof raw === 'string' ? { url: raw } : raw;
  const isFormData = req?.body instanceof FormData;
  return fetchBaseQuery({
    baseUrl: API_BASE,
    prepareHeaders(headers) {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (!isFormData) headers.set('Content-Type', 'application/json');
      return headers;
    },
  })(req as Parameters<ReturnType<typeof fetchBaseQuery>>[0], api as never, extraOptions as never);
};
