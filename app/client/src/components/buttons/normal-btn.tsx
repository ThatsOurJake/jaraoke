import type { ButtonProps } from './props';

export const NormalButton = ({ children, onClick }: ButtonProps) => (
  <button
    className="bg-blue-300 p-2 w-full rounded border-2 cursor-pointer"
    type="button"
    onClick={onClick}
  >
    {children}
  </button>
);
