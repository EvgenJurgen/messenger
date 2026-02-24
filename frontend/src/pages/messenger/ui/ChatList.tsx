import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetConversationsQuery, type ConversationItem } from '@/shared/api';
import { useSocket } from '@/features/socket';
import { getAvatarUrl } from '@/shared/lib/avatarUrl';
import { Avatar } from './Avatar';

function formatLastMessageDate(isoDate: string, yesterdayLabel: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const daysDiff = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));

  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (isYesterday) return yesterdayLabel;
  if (daysDiff < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

interface ChatListProps {
  currentUserId: string;
  onNavigate?: () => void;
}

export function ChatList({ currentUserId, onNavigate }: ChatListProps) {
  const { t } = useTranslation();
  const { data: conversations = [], isLoading } = useGetConversationsQuery();
  const { onlineUserIds, typingConversationIds } = useSocket();
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const handleChatClick = (id: string) => {
    onNavigate?.();
    navigate(`/chat/${id}`);
  };

  if (isLoading) {
    return (
      <div className="py-4 text-center text-sm text-muted">
        {t('chatList.loading')}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <p className="py-6 px-2 text-sm text-muted text-center">
        {t('chatList.empty')}
      </p>
    );
  }

  return (
    <ul className="space-y-0.5 overflow-y-auto flex-1 min-h-0">
      {conversations.map((c: ConversationItem) => {
        const other = c.otherUser;
        const displayName = other.nickname || other.id;
        const avatarUrl = getAvatarUrl(other.avatarPath);
        const last = c.lastMessage;
        const isOwn = last?.senderId === currentUserId;
        const isOtherTyping = typingConversationIds.has(c.id);
        const lastText = isOtherTyping
          ? (t('chat.typing') || 'Печатает')
          : last
            ? (isOwn ? `You: ${last.content}` : last.content)
            : 'No messages yet';
        const truncated = lastText.length > 40 ? lastText.slice(0, 37) + '...' : lastText;
        const isActive = conversationId === c.id;
        const lastCreatedAt = last?.createdAt ? formatLastMessageDate(last.createdAt, t('chatList.yesterday')) : '';
        const unreadCount = c.unreadCount ?? 0;

        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => handleChatClick(c.id)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                isActive ? 'bg-accent/20' : 'hover:bg-border'
              }`}
            >
              <div className="relative shrink-0">
                <Avatar src={avatarUrl} alt={displayName} size="md" online={onlineUserIds.has(other.id)} />
                {unreadCount > 0 && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-accent text-white text-xs font-medium"
                    aria-label={`${unreadCount} unread`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground-primary truncate">{displayName}</p>
                <p className="text-sm text-muted truncate">{truncated}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-0.5">
                {lastCreatedAt && (
                  <span className="text-xs text-muted">{lastCreatedAt}</span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
