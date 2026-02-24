import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useGetConversationsQuery } from '@/shared/api';
import { useTheme } from '@/widgets/header-with-settings';
import { setStoredLocale, type Locale } from '@/shared/lib/i18n';
import { useTranslation } from 'react-i18next';
import { getAvatarUrl } from '@/shared/lib/avatarUrl';
import { useSocket } from '@/features/socket';
import { useVideoCall } from '@/features/video-call';
import { Avatar } from './Avatar';

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

interface MessengerHeaderProps {
  onMenuClick?: () => void;
}

export function MessengerHeader({ onMenuClick }: MessengerHeaderProps) {
  const location = useLocation();
  const { conversationId } = useParams();
  const { logout } = useAuth();
  const { data: conversations } = useGetConversationsQuery();
  const { palette, togglePalette } = useTheme();
  const { i18n, t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { onlineUserIds } = useSocket();
  const { startCall } = useVideoCall();

  const isChat = conversationId && location.pathname.startsWith('/chat/');

  const otherUser = isChat ? conversations?.find((c) => c.id === conversationId)?.otherUser : null;
  const displayName = otherUser?.nickname || otherUser?.id || '';
  const avatarUrl = getAvatarUrl(otherUser?.avatarPath);
  const isOtherOnline = otherUser ? onlineUserIds.has(otherUser.id) : false;

  const handleVideoCall = () => {
    if (!conversationId || !otherUser || !isOtherOnline) return;
    startCall(conversationId, otherUser.id, otherUser.nickname ?? undefined);
  };

  const currentLocale = (i18n.language ?? 'ru') as Locale;
  const isDark = palette === 'palette-dark';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="shrink-0 border-b border-border bg-secondary px-3 py-2 flex items-center justify-between gap-2 min-h-[56px]">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-foreground-primary hover:bg-border transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon className="w-5 h-5 shrink-0 block" />
          </button>
        )}
        {isChat && otherUser && (
          <>
            <Avatar src={avatarUrl} alt={displayName} size="md" />
            <span className="font-medium text-foreground-primary truncate">{displayName}</span>
            <button
              type="button"
              onClick={handleVideoCall}
              disabled={!isOtherOnline}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-foreground-primary hover:bg-border transition-colors disabled:opacity-40 disabled:pointer-events-none"
              aria-label={t('videoCall.start') ?? 'Video call'}
              title={t('videoCall.start') ?? 'Video call'}
            >
              <PhoneIcon className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-foreground-primary hover:bg-border transition-colors"
          aria-label="Menu"
        >
          <DotsIcon className="w-5 h-5 shrink-0 block" />
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 py-1 min-w-[180px] rounded-lg border border-border bg-secondary shadow-lg z-50">
            <div className="px-3 py-2 text-xs text-muted border-b border-border">
              {t('header.language') ?? 'Language'}
            </div>
            <div className="flex p-1 gap-1">
              {(['ru', 'en'] as const).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => {
                    setStoredLocale(lng);
                    setDropdownOpen(false);
                  }}
                  className={`flex-1 min-w-0 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentLocale === lng
                      ? 'bg-accent text-white'
                      : 'text-muted hover:text-foreground-primary hover:bg-border'
                  }`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="px-3 py-2 text-xs text-muted border-b border-border mt-1">
              {t('header.theme') ?? 'Theme'}
            </div>
            <button
              type="button"
              onClick={() => {
                togglePalette();
                setDropdownOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground-primary hover:bg-border transition-colors"
            >
              {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
              <span>{isDark ? (t('header.lightTheme') ?? 'Light') : (t('header.darkTheme') ?? 'Dark')}</span>
            </button>
            <div className="border-t border-border my-1" />
            <button
              type="button"
              onClick={() => {
                logout();
                setDropdownOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-error hover:bg-border transition-colors"
            >
              <LogOutIcon className="w-4 h-4" />
              <span>{t('home.logout') ?? 'Log out'}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
