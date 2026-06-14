import { createContext, useContext } from 'react';
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
}) => (
  <MoneyLocaleContext.Provider value={{ ...defaultMoneyLocale, ...value }}>
    {children}
  </MoneyLocaleContext.Provider>
);

export const useMoneyLocale = () => useContext(MoneyLocaleContext);
