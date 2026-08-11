import { mdiCogOutline } from '@mdi/js';
import Icon from '@mdi/react';
import type { ComponentChildren } from 'preact';
import { SingIcon } from '../icons/sing';

interface WrapperProps {
  children: ComponentChildren;
}

export const Wrapper = ({ children }: WrapperProps) => (
  <div className="w-full h-full flex flex-col">
    <header className="py-3 bg-background shadow border-b-4 flex items-center justify-between px-6">
      <div>
        <p className="text-4xl font-bold text-center text-purple-300 font-sora">
          Jaraoke
        </p>
      </div>
      <div className="flex space-x-4">
        <a className="text-white" href="/" title="Sing">
          <div className="h-8 w-8 fill-purple-300">
            <SingIcon fill="#d8b4fe" />
          </div>
        </a>
        <a className="text-white" href="/settings" title="Settings">
          <div className="h-8 w-8 hover:rotate-180 transition-all">
            <Icon path={mdiCogOutline} color="#d8b4fe" />
          </div>
        </a>
      </div>
    </header>
    <div
      className="py-4 overflow-y-scroll h-full w-full flex bg-background-secondary scrollbar-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% -12%, rgba(168, 85, 247, 0.22) 0%, rgba(168, 85, 247, 0.10) 28%, transparent 62%),
          radial-gradient(circle at 88% 100%, rgba(236, 72, 153, 0.10) 0%, transparent 46%)
        `,
      }}
    >
      {children}
    </div>
  </div>
);
