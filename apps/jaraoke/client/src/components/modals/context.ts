import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export interface ModalContextValue {
  showConfirmation: (question: string) => Promise<boolean>;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

export const useModal = (): ModalContextValue => {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return ctx;
};
