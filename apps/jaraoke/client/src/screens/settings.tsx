import { LibrarySettingsSection } from '../components/settings/library';
import { Wrapper } from '../components/wrapper';

// TODO: Make a context that contains the settings data.
export const SettingsScreen = () => {
  return (
    <Wrapper>
      <div className="container mx-auto text-white py-2 h-full overflow-y-auto scrollbar-none">
        <p className="text-4xl font-bricolage font-bold">Settings</p>
        <div className="space-y-2 py-4 px-1">
          <LibrarySettingsSection />
        </div>
      </div>
    </Wrapper>
  );
};
