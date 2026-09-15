'use client';

import { Moon as MoonIcon, Sun as SunIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { useReversibleThemeToggle } from '@ploutizo/ui/hooks/use-reversible-theme-toggle';

// SSR and the first client render cannot read localStorage, so theme-dependent UI
// must defer until mount. See: https://github.com/pacocoursey/next-themes#avoid-hydration-mismatch
export const ThemeToggle = () => {
  const { mounted, resolvedAppearance, label, toggleTheme } =
    useReversibleThemeToggle();
  const displayLabel = mounted ? label : 'Switch to dark mode';
  const Icon = mounted && resolvedAppearance === 'dark' ? SunIcon : MoonIcon;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={displayLabel}
            onClick={toggleTheme}
          />
        }
      >
        <Icon />
      </TooltipTrigger>
      <TooltipContent>{displayLabel}</TooltipContent>
    </Tooltip>
  );
};
