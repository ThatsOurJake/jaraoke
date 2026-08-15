import Icon from '@mdi/react';
import type { ComponentChildren } from 'preact';

interface SettingsSectionProps {
  headerIcon: string;
  headerText: string;
  children: ComponentChildren;
}

export const SettingsSection = ({
  headerIcon,
  headerText,
  children,
}: SettingsSectionProps) => {
  return (
    <div className="border-2 border-zinc-700 w-full p-5 rounded bg-background-secondary/60">
      <div className="flex items-center space-x-2">
        <Icon path={headerIcon} color="#d8b4fe" className="h-6 w-6" />
        <p className="text-3xl font-bricolage">{headerText}</p>
      </div>
      <div className="h-px w-full my-4 bg-linear-to-r from-transparent via-zinc-400 to-transparent" />
      <div>{children}</div>
    </div>
  );
};
