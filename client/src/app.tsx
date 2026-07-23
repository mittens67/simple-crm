import { useState } from 'react';
import './app.scss'
import Navigation from './navigation';
import { ServerWakeUp } from './components/ui/server-wake-up';

function App() {
  const [server_ready, set_server_ready] = useState(false);

  if (!server_ready) {
    return <ServerWakeUp onSuccess={() => set_server_ready(true)} />;
  }

  return (
    <div className='app'>
      <Navigation />
    </div>
  )
}

export default App
