import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { HouseholdHookWrapper } from '@/test/household-hook-harness';
import type { ReactNode } from 'react';

export const ReviewTestProviders = ({ children }: { children: ReactNode }) => (
  <HouseholdHookWrapper>
    <TooltipProvider delay={0}>{children}</TooltipProvider>
  </HouseholdHookWrapper>
);
