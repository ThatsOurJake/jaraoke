import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';

import { Loading } from '../components/loading';
import { Wrapper } from '../components/wrapper';

export const SplashScreen = () => {
  const { route } = useLocation();
  const [importedTracks, setImportedTracks] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const minDisplayTime = new Promise<void>((resolve) =>
      setTimeout(resolve, 750),
    );

    const poll = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = (await res.json()) as {
            ready: boolean;
            importedTracks: number;
          };
          setImportedTracks(data.importedTracks ?? 0);
          if (data.ready) {
            await minDisplayTime;
            route('/');
            return;
          }
        }
      } catch {
        // transient error — keep polling
      }
      timer = setTimeout(poll, 1000);
    };

    poll();

    return () => clearTimeout(timer);
  }, []);

  return (
    <Wrapper>
      <div className="h-full w-full flex flex-col justify-center items-center gap-4">
        <Loading size="lg" />
        <p className="text-gray-200 text-lg">
          {importedTracks > 0
            ? `Imported ${importedTracks} track${importedTracks === 1 ? '' : 's'}…`
            : 'Starting up…'}
        </p>
      </div>
    </Wrapper>
  );
};
