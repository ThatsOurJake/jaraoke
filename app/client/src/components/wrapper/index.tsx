import type { ComponentChildren } from 'preact';

interface WrapperProps {
  children: ComponentChildren;
}

export const Wrapper = ({ children }: WrapperProps) => (
  <div className="w-full h-full flex flex-col">
    <header className="py-3 bg-purple-950 shadow">
      <p className="text-3xl text-center text-white">Jaraoke</p>
    </header>
    <div
      className="py-4 overflow-y-scroll h-full w-full bg-cover flex"
      style={{ backgroundImage: 'url("/OAK41A0.jpg")' }}
    >
      {children}
    </div>
  </div>
);
