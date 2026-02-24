import { createSlice } from '@reduxjs/toolkit';

import type { User } from '@/entities/user';
import { baseApi } from '@/shared/api/baseApi';

const ACCESS_TOKEN_KEY = 'accessToken';

interface AuthState {
  user: User | null;
  loading: boolean;
  checked: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: true,
  checked: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setNotAuthenticated(state) {
      state.user = null;
      state.loading = false;
      state.checked = true;
    },
    logout(state) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
      state.user = null;
      state.loading = false;
      state.checked = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(baseApi.endpoints.me.matchPending, (state) => {
        state.loading = true;
      })
      .addMatcher(baseApi.endpoints.me.matchFulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.checked = true;
      })
      .addMatcher(baseApi.endpoints.me.matchRejected, (state) => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
        }
        state.user = null;
        state.loading = false;
        state.checked = true;
      });
  },
});

export const { setNotAuthenticated, logout } = authSlice.actions;

export const selectAuth = (state: { auth: AuthState }) => state.auth;

export function getAccessTokenKey(): string {
  return ACCESS_TOKEN_KEY;
}
