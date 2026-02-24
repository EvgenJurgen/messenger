import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { User } from '@/entities/user';
import { useSocket } from '@/features/socket';
import { getAvatarUrl } from '@/shared/lib/avatarUrl';
import { Avatar } from './Avatar';

interface CurrentUserCardProps {
  user: User;
}

export function CurrentUserCard({ user }: CurrentUserCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { connected } = useSocket();
  const displayName = user.nickname || user.email;
  const avatarUrl = getAvatarUrl(user.avatarPath);

  return (
    <button
      type="button"
      onClick={() => navigate('/profile')}
      className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 rounded-lg hover:bg-border transition-colors text-left"
    >
      <Avatar src={avatarUrl} alt={displayName} size="lg" className="shrink-0" online={connected} />
      <span className="font-semibold text-foreground-primary text-center truncate max-w-full">
        {displayName}
      </span>
      <span className="text-sm text-muted">{connected ? t('status.online') : t('status.offline')}</span>
    </button>
  );
}
