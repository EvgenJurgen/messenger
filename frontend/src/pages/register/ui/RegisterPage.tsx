import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth';
import { ApiError, useRegisterMutation } from '@/shared/api';
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

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t('register.passwordsMismatch'));
      return;
    }
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setError(t('errors.nickname_min_length'));
      return;
    }
    try {
      const { accessToken } = await registerUser({ email, nickname: trimmedNickname, password }).unwrap();
      setAuth(accessToken);
      navigate('/', { replace: true });
    } catch (err) {
      setError(ApiError.getDisplayText(err, t, 'common.errorRegister'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary">
      <AuthPageSettings />
      <Card className="w-full max-w-[360px]">
        <CardHeader className="text-center">
          <CardTitle>{t('register.title')}</CardTitle>
          <CardDescription>{t('register.description')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="register-email">{t('register.email')}</Label>
              <Input
                id="register-email"
                type="email"
                placeholder={t('register.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-nickname">{t('register.nickname')}</Label>
              <Input
                id="register-nickname"
                type="text"
                placeholder={t('register.nicknamePlaceholder')}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoComplete="username"
                required
                minLength={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">{t('register.password')}</Label>
              <Input
                id="register-password"
                type="password"
                placeholder={t('register.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-confirm">{t('register.confirmPassword')}</Label>
              <Input
                id="register-confirm"
                type="password"
                placeholder={t('register.passwordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('register.submitLoading') : t('register.submit')}
            </Button>
            <p className="text-sm text-muted">
              {t('register.hasAccount')}{' '}
              <Link
                to="/login"
                className="font-medium text-accent hover:underline"
              >
                {t('register.loginLink')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
