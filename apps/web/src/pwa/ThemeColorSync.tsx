import { useEffect } from 'react';
import { themeColorForScheme } from './theme-color';

const schemeFromClassList = (classList: DOMTokenList) => {
  if (classList.contains('dark')) return 'dark' as const;
  if (classList.contains('light')) return 'light' as const;
  return undefined;
};

/** Follows the theme class on `<html>`, which can differ from the OS media query. */
export const ThemeColorSync = () => {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const color = themeColorForScheme(schemeFromClassList(root.classList));
      if (!color) return;
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((meta) => meta.setAttribute('content', color));
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return null;
};
