import classNames from 'classnames';
import type { ButtonProps } from './props';

export const NormalButton = ({ children, onClick, fontSize }: ButtonProps) => {
  const classes = classNames({
    'bg-purple-300': true,
    'p-2': true,
    'w-full': true,
    rounded: true,
    'cursor-pointer': true,
    'font-bricolage': true,
    'text-black': true,
    'font-semibold': true,
    'text-sm': fontSize === 'small',
    'text-base': fontSize === 'normal',
    'text-xl': fontSize === 'large',
  });

  return (
    <button className={classes} type="button" onClick={onClick}>
      {children}
    </button>
  );
};
