import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { CloudOff, Loader2 } from 'lucide-react';
import './server-wake-up.scss';

const HEALTH_CHECK_QUERY = gql`
  query HealthCheck {
    health
  }
`;

const MAX_ATTEMPTS = 6;
const DELAY_MS = 5000;

/**
 * A non-blocking banner for a cold backend.
 *
 * The free Render tier spins down after inactivity, so the first request can
 * take a while. This used to gate the *entire* app — including /login — behind
 * a full-screen wait of up to 30 seconds, so a user could not even start typing
 * their credentials while the server woke up.
 *
 * Now the app renders immediately and this appears only while the server is
 * unreachable, disappearing once it answers.
 */
export const ServerWakeUp = () => {
  const [attempts, set_attempts] = useState(0);
  const { data, error, refetch } = useQuery(HEALTH_CHECK_QUERY, {
    fetchPolicy: 'network-only',
    // A failed health check is expected on a cold start, not an app error.
    errorPolicy: 'all',
  });

  const reachable = Boolean(data?.health);
  const gave_up = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    if (reachable || gave_up) return;

    const timer = setTimeout(() => {
      set_attempts((current) => current + 1);
      void refetch();
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [reachable, gave_up, attempts, refetch]);

  // Nothing to say while it is working, or before the first failure.
  if (reachable || !error) return null;

  return (
    <div className="wake-banner" role="status" aria-live="polite">
      {gave_up ? (
        <>
          <CloudOff aria-hidden="true" />
          <span>
            Cannot reach the server. It may still be starting up — reload in a moment.
          </span>
          <button
            type="button"
            onClick={() => {
              set_attempts(0);
              void refetch();
            }}
          >
            Retry
          </button>
        </>
      ) : (
        <>
          <Loader2 className="wake-spin" aria-hidden="true" />
          <span>
            Waking the server… this can take up to 30 seconds on the free tier. You can start
            signing in now.
          </span>
        </>
      )}
    </div>
  );
};

export default ServerWakeUp;
