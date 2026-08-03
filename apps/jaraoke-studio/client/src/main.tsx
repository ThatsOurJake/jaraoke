import { render } from 'preact';
import './index.css';
import { App } from './app';
import { TimelineStoreProvider } from './stores/timeline-store';

const appElement = document.getElementById('app');

if (!appElement) {
  throw new Error('App mount element #app was not found');
}

render(
  <TimelineStoreProvider>
    <App />
  </TimelineStoreProvider>,
  appElement,
);
