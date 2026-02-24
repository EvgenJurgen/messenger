import { authSlice } from '@/features/auth/model/authSlice';
import { baseApi } from '@/shared/api/baseApi';

/**
 * All domain reducers in one place.
 * Add a new slice: import it here and add to the object.
 * Remove a feature: delete the import and the key.
 */
export const rootReducer = {
  auth: authSlice.reducer,
  [baseApi.reducerPath]: baseApi.reducer,
};
