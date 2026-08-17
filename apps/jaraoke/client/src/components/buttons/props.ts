import type { ComponentChildren } from 'preact';

export interface ButtonProps {
  children: ComponentChildren;
  onClick?: () => void;
  fontSize?: 'normal' | 'small' | 'large';
}
