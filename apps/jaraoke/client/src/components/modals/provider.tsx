import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useCallback, useRef, useState } from 'preact/hooks';
import { ConfirmationModal } from './confirmation';
import { ModalContext } from './context';

interface PendingConfirmation {
  question: string;
  resolve: (value: boolean) => void;
}

interface ModalProviderProps {
  children: ComponentChildren;
}

export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const showConfirmation = useCallback((question: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPending({ question, resolve });
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setPending(null);
  }, []);

  return (
    <ModalContext.Provider value={{ showConfirmation }}>
      {children}
      {pending &&
        createPortal(
          <ConfirmationModal
            question={pending.question}
            onConfirm={() => settle(true)}
            onDeny={() => settle(false)}
          />,
          document.body,
        )}
    </ModalContext.Provider>
  );
};
