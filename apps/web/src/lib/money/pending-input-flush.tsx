import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
} from 'react';

type PendingInputFlushContextValue = {
  register: (id: string, flush: () => void) => void;
  unregister: (id: string) => void;
  flushAll: () => void;
};

const PendingInputFlushContext =
  createContext<PendingInputFlushContextValue | null>(null);

export const PendingInputFlushProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const flushesRef = useRef(new Map<string, () => void>());

  const register = useCallback((id: string, flush: () => void) => {
    flushesRef.current.set(id, flush);
  }, []);

  const unregister = useCallback((id: string) => {
    flushesRef.current.delete(id);
  }, []);

  const flushAll = useCallback(() => {
    for (const flush of flushesRef.current.values()) {
      flush();
    }
  }, []);

  return (
    <PendingInputFlushContext.Provider
      value={{ register, unregister, flushAll }}
    >
      {children}
    </PendingInputFlushContext.Provider>
  );
};

export const useRegisterInputFlush = (flush: () => void) => {
  const context = useContext(PendingInputFlushContext);
  const id = useId();

  useEffect(() => {
    if (!context) return;
    context.register(id, flush);
    return () => context.unregister(id);
  }, [context, flush, id]);
};

export const useFlushPendingInputs = () => {
  const context = useContext(PendingInputFlushContext);
  return context?.flushAll ?? (() => {});
};
