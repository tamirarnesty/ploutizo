import { cn } from '@ploutizo/ui/lib/utils';
import { TELEMETRY_REPLAY_BLOCK_ATTR } from './privacy';
import type { ReactNode } from 'react';

interface TelemetryReplayBlockProps {
  children: ReactNode;
  className?: string;
}

/**
 * Marks finance-sensitive UI for session replay blocking.
 * Use on page regions and finance overlay roots (sheets, dialogs).
 * Pair with PostHog `blockSelector` privacy config.
 */
export const TelemetryReplayBlock = ({
  children,
  className,
}: TelemetryReplayBlockProps) => (
  <div
    className={cn('ph-no-capture', className)}
    {...{ [TELEMETRY_REPLAY_BLOCK_ATTR]: '' }}
  >
    {children}
  </div>
);
