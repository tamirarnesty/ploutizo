import { createContext, useContext, useMemo } from 'react';
import { createNoopTelemetryClient } from '@ploutizo/telemetry';
import type { TelemetryClient } from '@ploutizo/telemetry';

const TelemetryContext = createContext<TelemetryClient>(
  createNoopTelemetryClient()
);

export const TelemetryProvider = ({
  client,
  children,
}: {
  client: TelemetryClient;
  children: React.ReactNode;
}) => {
  const value = useMemo(() => client, [client]);
  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetryClient = (): TelemetryClient =>
  useContext(TelemetryContext);
