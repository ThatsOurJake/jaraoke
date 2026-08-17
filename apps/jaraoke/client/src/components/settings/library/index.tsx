import { mdiFolder } from '@mdi/js';
import { SettingsSection } from '../section';
import { OutdatedSongs } from './outdated-songs';

export const LibrarySettingsSection = () => {
  return (
    <SettingsSection headerText="Library" headerIcon={mdiFolder}>
      <OutdatedSongs />
    </SettingsSection>
  );
};
