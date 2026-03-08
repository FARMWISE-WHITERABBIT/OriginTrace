import { defaultLocale, type Locale } from '@/i18n';

export async function getMessages(locale: Locale = defaultLocale) {
  try {
    return (await import(`@/messages/${locale}.json`)).default;
  } catch {
    return (await import(`@/messages/en.json`)).default;
  }
}

export function getLocaleFromCookie(cookieHeader?: string): Locale {
  if (!cookieHeader) return defaultLocale;
  const match = cookieHeader.match(/origintrace-locale=([a-z]{2})/);
  if (match && ['en', 'fr', 'ar'].includes(match[1])) {
    return match[1] as Locale;
  }
  return defaultLocale;
}
