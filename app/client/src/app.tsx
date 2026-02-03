import { LocationProvider, Route, Router } from 'preact-iso';
import { FallbackScreen } from './screens/fallback';
import { HomeScreen } from './screens/home';
import { PlayerScreen } from './screens/player';

export const App = () => {
  return (
    <LocationProvider>
      <Router>
        <Route path="/" component={HomeScreen} />
        <Route path="/play" component={PlayerScreen} />
        <Route path="*" component={FallbackScreen} />
      </Router>
    </LocationProvider>
  );
};
