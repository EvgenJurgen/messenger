import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch } from '@/app/store';
import { baseApi } from '@/shared/api/baseApi';
import { getAccessTokenKey, selectAuth } from './authSlice';
import { logout as logoutAction, setNotAuthenticated } from './authSlice';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, checked } = useSelector(selectAuth);

  const login = useCallback(
    (accessToken: string) => {
      localStorage.setItem(getAccessTokenKey(), accessToken);
      dispatch(baseApi.endpoints.me.initiate(undefined, { forceRefetch: true }));
    },
    [dispatch],
  );

  const logout = useCallback(() => {
    dispatch(logoutAction());
  }, [dispatch]);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(getAccessTokenKey());
    if (!token) {
      dispatch(setNotAuthenticated());
      return;
    }
    dispatch(baseApi.endpoints.me.initiate(undefined, { forceRefetch: true }));
  }, [dispatch]);

  return {
    user,
    loading,
    checked,
    login,
    logout,
    refreshUser,
  };
}
