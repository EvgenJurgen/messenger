import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '@/features/auth';
import {
  baseApi,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} from '@/shared/api';
import { ApiError } from '@/shared/api';
import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';

function PaperPlaneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4L22 2Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
import { getAvatarUrl } from '@/shared/lib/avatarUrl';
import { useToast } from './Toast';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ProfileEditPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [updateProfile, { isLoading: updating }] = useUpdateProfileMutation();
  const [uploadAvatar, { isLoading: uploading }] = useUploadAvatarMutation();

  const displayName = user?.nickname || user?.email || '';
  const avatarUrl = getAvatarUrl(user?.avatarPath);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setAvatarError(null);
      if (!ALLOWED_TYPES.includes(file.type)) {
        setAvatarError(t('profile.avatarInvalidType') || 'Only JPEG, PNG, GIF and WebP allowed');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setAvatarError(t('profile.avatarTooLarge') || 'Image must be 20 MB or smaller');
        return;
      }
      try {
        const formData = new FormData();
        formData.append('file', file);
        await uploadAvatar(formData).unwrap();
        void dispatch(baseApi.endpoints.me.initiate(undefined, { forceRefetch: true }) as never);
        toast.success(t('profile.updated') || 'Profile updated');
      } catch (err) {
        const msg = ApiError.getDisplayText(err, t, 'error.generic');
        toast.error(msg);
      }
    },
    [uploadAvatar, toast, t],
  );

  const handleSaveNickname = useCallback(async () => {
    try {
      await updateProfile({ nickname: nickname.trim() || null }).unwrap();
      toast.success(t('profile.updated') || 'Profile updated');
    } catch (err) {
      const msg = ApiError.getDisplayText(err, t, 'error.generic');
      toast.error(msg);
    }
  }, [nickname, updateProfile, toast, t]);

  if (!user) return null;

  return (
    <div className="h-full flex items-center justify-center p-4 sm:p-6">
      <div
        className="w-full max-w-[min(400px,90vw)] min-w-0 flex flex-col items-center justify-center gap-6 rounded-xl border border-border bg-secondary p-4 sm:p-6 md:p-8"
        style={{ maxHeight: '70vh' }}
      >
        <div className="flex flex-col items-center gap-2">
          <Avatar
            src={avatarUrl}
            alt={displayName}
            size="lg"
            onFileSelect={handleFileSelect}
          />
          {uploading && <p className="text-sm text-muted">{t('profile.uploading')}</p>}
          {avatarError && (
            <p className="text-sm text-error max-w-[240px] text-center">{avatarError}</p>
          )}
        </div>
        <div className="w-full flex gap-2 items-center">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
            placeholder={t('profile.nicknamePlaceholder') || 'Nickname'}
            className="flex-1 min-w-0 rounded-lg border border-border bg-primary px-3 py-2 text-foreground-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="button"
            onClick={handleSaveNickname}
            disabled={updating}
            className="shrink-0 w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none transition-colors"
            aria-label={updating ? (t('common.saving') || 'Saving...') : (t('profile.save') || 'Save')}
          >
            <PaperPlaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
