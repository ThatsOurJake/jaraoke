import type { ComponentChildren } from 'preact';

export const OutdatedSongsWrapper = ({
  children,
}: {
  children: ComponentChildren;
}) => (
  <div className="bg-zinc-800 p-4 rounded border border-zinc-700">
    <p className="text-xl">Outdated Songs</p>
    {children}
  </div>
);
