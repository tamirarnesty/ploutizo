import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';

const MembersInviteFocusContext =
  createContext<RefObject<HTMLInputElement | null> | null>(null);

export const MembersInviteFocusProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <MembersInviteFocusContext.Provider value={inputRef}>
      {children}
    </MembersInviteFocusContext.Provider>
  );
};

export const useMembersInviteEmailInputRef = () => {
  const ref = useContext(MembersInviteFocusContext);
  if (!ref) {
    throw new Error(
      'useMembersInviteEmailInputRef must be used within MembersInviteFocusProvider'
    );
  }
  return ref;
};

export const useFocusMembersInviteEmail = () => {
  const ref = useMembersInviteEmailInputRef();
  return useCallback(() => {
    ref.current?.focus();
  }, [ref]);
};
