import { useEffect, type ReactNode } from 'react';
import { useDispatch } from 'react-redux';

import type { AppDispatch } from '@/app/store';
import { baseApi } from '@/shared/api/baseApi';
import { getAccessTokenKey, setNotAuthenticated } from '../model/authSlice';

/**
 * Dispatches initial auth check on mount (token in localStorage → fetch /me).
 * Must be rendered inside Redux Provider.
 */
export function AuthInit({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const token = localStorage.getItem(getAccessTokenKey());
    if (!token) {
      dispatch(setNotAuthenticated());
      return;
    }
    dispatch(baseApi.endpoints.me.initiate());
  }, [dispatch]);

  return <>{children}</>;
}
