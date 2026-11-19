import { createFileRoute } from '@tanstack/react-router';
import { PersistenceSpike } from '../components/persistence-spike/PersistenceSpike';
import { validatePersistenceSpikeSearch } from '../components/persistence-spike/persistenceSpikeSearch';

const PersistenceSpikeRoute = () => {
  const { api } = Route.useSearch();
  return <PersistenceSpike apiBlocked={api === 'offline'} />;
};

export const Route = createFileRoute('/_layout/persistence-spike')({
  validateSearch: validatePersistenceSpikeSearch,
  // OPFS and wa-sqlite are browser-only. The shell can still render on the
  // server; this route's component does not.
  ssr: false,
  component: PersistenceSpikeRoute,
});
