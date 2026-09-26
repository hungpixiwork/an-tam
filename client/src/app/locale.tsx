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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [locale, setLocalLocale] = useState<Locale>('vi');
  const [currency, setLocalCurrency] = useState<Currency>('VND');

  useEffect(() => {
    if (settings) {
      if (settings.locale) setLocalLocale(settings.locale);
      if (settings.currency) setLocalCurrency(settings.currency);
    } else {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'vi' || browserLang === 'en' || browserLang === 'zh') {
        setLocalLocale(browserLang);
      }
    }
  }, [settings]);

  const handleSetLocale = (newLocale: Locale) => {
    setLocalLocale(newLocale);
    if (settings) {
      updateSettings.mutate({ locale: newLocale });
    }
  };

  const handleSetCurrency = (newCurrency: Currency) => {
    setLocalCurrency(newCurrency);
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
