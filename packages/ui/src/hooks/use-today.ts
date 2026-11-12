import { useMemo, useSyncExternalStore } from 'react';
import { format, parseISO } from 'date-fns';

const toDayKey = (date: Date) => format(date, 'yyyy-MM-dd');

const msUntilNextDay = () => {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );
  return nextMidnight.getTime() - now.getTime();
};

// Re-checks at local midnight and whenever the tab becomes visible again
// (timers are throttled or paused while a tab sleeps).
const subscribe = (onChange: () => void) => {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    timer = setTimeout(() => {
      onChange();
      schedule();
    }, msUntilNextDay());
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') onChange();
  };
  schedule();
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
};

const getSnapshot = () => toDayKey(new Date());

export const useToday = (): Date => {
  const dayKey = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => parseISO(dayKey), [dayKey]);
};
