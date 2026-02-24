import { useTranslation } from 'react-i18next';
import { setStoredLocale, type Locale } from '@/shared/lib/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.language ?? 'ru') as Locale;

  return (
    <div className="flex rounded-lg overflow-hidden border border-border bg-secondary">
      {(['ru', 'en'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => setStoredLocale(lng)}
          className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium transition-colors ${
            current === lng
              ? 'bg-accent text-white'
              : 'text-muted hover:text-foreground-primary hover:bg-border'
          }`}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
