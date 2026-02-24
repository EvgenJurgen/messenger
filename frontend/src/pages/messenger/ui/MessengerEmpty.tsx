import { useTranslation } from 'react-i18next';

export function MessengerEmpty() {
  const { t } = useTranslation();
  return (
    <div className="h-full flex items-center justify-center text-muted">
      <p className="text-sm">{t('messenger.empty') || 'Select a chat or edit your profile'}</p>
    </div>
  );
}
