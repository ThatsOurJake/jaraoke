import {
  getSharedGreeting,
  type StudioHealthResponse,
} from 'jaraoke-shared/hello';
import { useEffect, useState } from 'preact/hooks';

export const App = () => {
  const [health, setHealth] = useState<StudioHealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error(`Health request failed with ${response.status}`);
        }

        const body = (await response.json()) as StudioHealthResponse;
        setHealth(body);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Unknown health error',
        );
      }
    };

    void load();
  }, []);

  return (
    <main className="studio-shell">
      <section className="studio-card">
        <p className="studio-eyebrow">Jaraoke Monorepo Migration</p>
        <h1>Jaraoke Studio</h1>
        <p className="studio-copy">
          This is the placeholder studio app shell. The full authoring workflow
          comes later; this only proves the split, launcher wiring, and shared
          package access.
        </p>
        <dl className="studio-status-list">
          <div>
            <dt>Shared helper</dt>
            <dd>{getSharedGreeting('jaraoke-studio client')}</dd>
          </div>
          <div>
            <dt>Backend status</dt>
            <dd>{health?.status ?? 'loading'}</dd>
          </div>
          <div>
            <dt>Backend app name</dt>
            <dd>{health?.appName ?? 'pending'}</dd>
          </div>
        </dl>
        {errorMessage ? <p className="studio-error">{errorMessage}</p> : null}
      </section>
    </main>
  );
};
