import { createContext, useContext, useMemo } from 'react';
import {
  DEFAULT_CURRENCY,
  DEFAULT_MONEY_LOCALE,
} from '@ploutizo/utils/currency';

export type MoneyLocale = {
  locale: string;
  currency: string;
};

const defaultMoneyLocale: MoneyLocale = {
  locale: DEFAULT_MONEY_LOCALE,
  currency: DEFAULT_CURRENCY,
};

const MoneyLocaleContext = createContext<MoneyLocale>(defaultMoneyLocale);

export const MoneyLocaleProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: Partial<MoneyLocale>;
}) => {
  const locale = value?.locale ?? defaultMoneyLocale.locale;
  const currency = value?.currency ?? defaultMoneyLocale.currency;
  const moneyLocale = useMemo(() => ({ locale, currency }), [locale, currency]);
  return (
    <MoneyLocaleContext.Provider value={moneyLocale}>
      {children}
    </MoneyLocaleContext.Provider>
  );
};

export const useMoneyLocale = () => useContext(MoneyLocaleContext);
