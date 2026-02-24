import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLazySearchUsersQuery, useGetOrCreateConversationMutation } from '@/shared/api';
import type { SearchUser } from '@/shared/api';
import { getAvatarUrl } from '@/shared/lib/avatarUrl';
import { Avatar } from './Avatar';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

interface SearchUsersProps {
  currentUserId: string;
}

export function SearchUsers(_props: SearchUsersProps) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [search, { data: users = [], isFetching }] = useLazySearchUsersQuery();
  const [getOrCreateConversation] = useGetOrCreateConversationMutation();
  const navigate = useNavigate();

  useEffect(() => {
    if (q.length < MIN_CHARS) return;
    const t = setTimeout(() => {
      search({ q, limit: 10, offset: 0 });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, search]);

  const onUserClick = useCallback(
    async (user: SearchUser) => {
      try {
        const conv = await getOrCreateConversation(user.id).unwrap();
        setQ('');
        navigate(`/chat/${conv.id}`);
      } catch {
        // error handled by mutation
      }
    },
    [getOrCreateConversation, navigate],
  );

  return (
    <div className="space-y-2">
      <input
        type="search"
        placeholder={t('search.placeholder')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-lg border border-border bg-primary px-3 py-2 text-sm text-foreground-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />
      {q.length >= MIN_CHARS && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-secondary">
          {isFetching && (
            <p className="p-2 text-sm text-muted">{t('search.searching')}</p>
          )}
          {!isFetching && users.length === 0 && (
            <p className="p-2 text-sm text-muted">{t('search.noUsers')}</p>
          )}
          {!isFetching &&
            users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onUserClick(u)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-border transition-colors text-left"
              >
                <Avatar
                  src={getAvatarUrl(u.avatarPath)}
                  alt={u.nickname || u.email}
                  size="sm"
                />
                <span className="flex-1 truncate text-foreground-primary text-sm">
                  {u.nickname || u.email}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
