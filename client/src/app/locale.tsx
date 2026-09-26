import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Locale, Currency } from '@shared/i18n';
import { t } from '@shared/i18n';
import { useSettings, useUpdateSettings } from '@/lib/queries';

interface LocaleValue {
  locale: Locale;
  currency: Currency;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
}

const LocaleContext = createContext<LocaleValue | null>(null);

const STORAGE_LOCALE_KEY = 'antam_locale';
const STORAGE_CURRENCY_KEY = 'antam_currency';

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_LOCALE_KEY) as Locale | null;
    if (saved === 'vi' || saved === 'en' || saved === 'zh') return saved;
    const browser = navigator.language?.toLowerCase() || '';
    if (browser.startsWith('zh')) return 'zh';
    if (browser.startsWith('en')) return 'en';
  } catch {
    // fallback
  }
  return 'vi';
}

function getInitialCurrency(loc: Locale): Currency {
  try {
    const saved = localStorage.getItem(STORAGE_CURRENCY_KEY) as Currency | null;
    if (saved === 'VND' || saved === 'CNY' || saved === 'USD') return saved;
  } catch {
    // fallback
  }
  if (loc === 'zh') return 'CNY';
  if (loc === 'en') return 'USD';
  return 'VND';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [locale, setLocalLocale] = useState<Locale>(getInitialLocale);
  const [currency, setLocalCurrency] = useState<Currency>(() => getInitialCurrency(getInitialLocale()));

  // Sync when user settings arrive from backend
  useEffect(() => {
    if (settings) {
      if (settings.locale && (settings.locale === 'vi' || settings.locale === 'en' || settings.locale === 'zh')) {
        setLocalLocale(settings.locale as Locale);
        try { localStorage.setItem(STORAGE_LOCALE_KEY, settings.locale); } catch { /* ignore */ }
      }
      if (settings.currency && (settings.currency === 'VND' || settings.currency === 'CNY' || settings.currency === 'USD')) {
        setLocalCurrency(settings.currency as Currency);
        try { localStorage.setItem(STORAGE_CURRENCY_KEY, settings.currency); } catch { /* ignore */ }
      }
    }
  }, [settings]);

  const handleSetLocale = (newLocale: Locale) => {
    setLocalLocale(newLocale);
    try { localStorage.setItem(STORAGE_LOCALE_KEY, newLocale); } catch { /* ignore */ }
    if (settings) {
      updateSettings.mutate({ locale: newLocale });
    }
  };

  const handleSetCurrency = (newCurrency: Currency) => {
    setLocalCurrency(newCurrency);
    try { localStorage.setItem(STORAGE_CURRENCY_KEY, newCurrency); } catch { /* ignore */ }
    if (settings) {
      updateSettings.mutate({ currency: newCurrency });
    }
  };

  const translate = (key: string, vars?: Record<string, string | number>) => t(locale, key, vars);

  const value: LocaleValue = {
    locale,
    currency,
    t: translate,
    setLocale: handleSetLocale,
    setCurrency: handleSetCurrency,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale phải nằm trong <LocaleProvider>');
  return ctx;
}
