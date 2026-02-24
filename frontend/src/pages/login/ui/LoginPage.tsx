import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth';
import { ApiError, useLoginMutation } from '@/shared/api';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/ui';
import { AuthPageSettings } from '@/widgets/header-with-settings';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { accessToken } = await login({ email, password }).unwrap();
      setAuth(accessToken);
      navigate('/', { replace: true });
    } catch (err) {
      setError(ApiError.getDisplayText(err, t, 'common.errorLogin'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary">
      <AuthPageSettings />
      <Card className="w-full max-w-[360px]">
        <CardHeader className="text-center">
          <CardTitle>{t('login.title')}</CardTitle>
          <CardDescription>{t('login.description')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="login-email">{t('login.email')}</Label>
              <Input
                id="login-email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">{t('login.password')}</Label>
              <Input
                id="login-password"
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('login.submitLoading') : t('login.submit')}
            </Button>
            <p className="text-sm text-muted">
              {t('login.noAccount')}{' '}
              <Link
                to="/register"
                className="font-medium text-accent hover:underline"
              >
                {t('login.registerLink')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
