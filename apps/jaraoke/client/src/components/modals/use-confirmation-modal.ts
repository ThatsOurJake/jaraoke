import { useModal } from './context';

export const useConfirmationModal = () => {
  const { showConfirmation } = useModal();
  return { showModal: showConfirmation };
};
