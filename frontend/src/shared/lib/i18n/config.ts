import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';

const STORAGE_KEY = 'app-language';

export type Locale = 'en' | 'ru';

const supportedLocales: Locale[] = ['en', 'ru'];

function getSystemLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('ru')) return 'ru';
  return 'en';
}

const savedLang = (typeof localStorage !== 'undefined'
  ? localStorage.getItem(STORAGE_KEY)
  : null) as Locale | null;

const initialLng = savedLang ?? getSystemLocale();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en as Record<string, unknown> },
    ru: { translation: ru as Record<string, unknown> },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export function getStoredLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && supportedLocales.includes(stored)) return stored;
  return getSystemLocale();
}

export function setStoredLocale(lng: Locale): void {
  localStorage.setItem(STORAGE_KEY, lng);
  i18n.changeLanguage(lng);
}

export default i18n;
