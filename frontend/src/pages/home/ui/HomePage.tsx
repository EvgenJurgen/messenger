import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/ui';

export function HomePage() {
  const { t } = useTranslation();
  const { user, loading, checked, logout } = useAuth();

  if (!checked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <p className="text-muted">{t('common.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-primary text-foreground-primary">
      <div className="max-w-md w-full rounded-xl border border-border bg-secondary p-6 space-y-4">
        <h1 className="text-xl font-semibold">{t('home.welcome')}</h1>
        <p className="text-muted">{t('home.loggedInAs', { email: user.email })}</p>
        <div className="flex gap-3">
          <Button onClick={() => logout()} variant="outline">
            {t('home.logout')}
          </Button>
          <Link
            to="/login"
            className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-lg border border-border bg-secondary text-foreground-primary hover:bg-border"
          >
            {t('home.toLoginForm')}
          </Link>
        </div>
      </div>
    </div>
  );
}
