import { Navigate } from 'react-router-dom';
import { useAuth } from '../model/useAuth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, checked } = useAuth();
  if (!checked || loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
