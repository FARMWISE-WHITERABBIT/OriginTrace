'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { defaultLocale, getDirection, type Locale, locales } from '@/i18n';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  direction: 'ltr' | 'rtl';
}

const LocaleContext = createContext<LocaleContextType>({
  locale: defaultLocale,
  setLocale: () => {},
  direction: 'ltr',
});

export function useLocale() {
  return useContext(LocaleContext);
}

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  try {
    const stored = localStorage.getItem('origintrace-locale');
    if (stored && locales.includes(stored as Locale)) {
      return stored as Locale;
    }
  } catch {}
  return defaultLocale;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null);
  const [isReady, setIsReady] = useState(false);

  const loadMessages = useCallback(async (loc: Locale) => {
    try {
      const mod = await import(`@/messages/${loc}.json`);
      setMessages(mod.default);
    } catch {
      const mod = await import('@/messages/en.json');
      setMessages(mod.default);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredLocale();
    setLocaleState(stored);
    loadMessages(stored).then(() => setIsReady(true));
  }, [loadMessages]);

  useEffect(() => {
    const dir = getDirection(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('origintrace-locale', newLocale);
    document.cookie = `origintrace-locale=${newLocale};path=/;max-age=31536000;samesite=lax`;
    loadMessages(newLocale);
  }, [loadMessages]);

  const direction = getDirection(locale);

  if (!isReady || !messages) {
    return <>{children}</>;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, direction }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
