import './app.scss';
import Navigation from './navigation';
import { ServerWakeUp } from './components/ui/server-wake-up';

/**
 * The app renders immediately. ServerWakeUp is a non-blocking banner rather
 * than a gate, so a cold backend no longer hides the login form for up to
 * thirty seconds.
 */
function App() {
  return (
    <div className="app">
      <Navigation />
      <ServerWakeUp />
    </div>
  );
}

export default App;
