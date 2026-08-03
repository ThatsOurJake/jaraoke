import { LocationProvider, Route, Router } from 'preact-iso';
import { FallbackScreen } from './screens/fallback';
import { HomeScreen } from './screens/home';
import { PlayerScreen } from './screens/player';
import { SettingsScreen } from './screens/settings';
import { SplashScreen } from './screens/splash';

export const App = () => {
  return (
    <LocationProvider>
      <Router>
        <Route path="/" component={HomeScreen} />
        <Route path="/splash" component={SplashScreen} />
        <Route path="/play" component={PlayerScreen} />
        <Route path="/settings" component={SettingsScreen} />
        <Route path="*" component={FallbackScreen} />
      </Router>
    </LocationProvider>
  );
};
