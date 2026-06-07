'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Moon as MoonIcon,
  Sun as SunIcon,
  SunMoon as SunMoonIcon,
} from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';

const cycleMap = { system: 'light', light: 'dark', dark: 'system' } as const;
type Theme = keyof typeof cycleMap;

// SSR and the first client render cannot read localStorage, so theme-dependent UI
// must defer until mount. See: https://github.com/pacocoursey/next-themes#avoid-hydration-mismatch
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = (theme ?? 'system') as Theme;
  const displayTheme = mounted ? current : 'system';
  const label = displayTheme.charAt(0).toUpperCase() + displayTheme.slice(1);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setTheme(cycleMap[current])}
          />
        }
      >
        {displayTheme === 'system' && <SunMoonIcon />}
        {displayTheme === 'light' && <SunIcon />}
        {displayTheme === 'dark' && <MoonIcon />}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
