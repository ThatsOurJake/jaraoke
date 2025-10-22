import { LocationProvider, Route, Router } from 'preact-iso';
import { HomeScreen } from './screens/home';

export const App = () => {
  return (
    <LocationProvider>
      <div className="w-full h-full flex flex-col">
        <header className="py-3 bg-purple-950 shadow">
          <p className="text-3xl text-center text-white">Jaraoke</p>
        </header>
        <div
          className="py-4 overflow-y-scroll h-full w-full bg-cover flex"
          style={{ backgroundImage: 'url("/OAK41A0.jpg")' }}
        >
          <Router>
            <Route path="/" component={HomeScreen} />
            {/* Extra route to stop types moaning */}
            <Route path="*" component={() => <div />} />
          </Router>
        </div>
      </div>
    </LocationProvider>
  );
};
