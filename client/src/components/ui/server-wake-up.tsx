import { useEffect, useState } from 'react';
import { apollo_client } from '../../lib/apollo';
import { gql } from '@apollo/client';

interface ServerWakeUpProps {
  onSuccess: () => void;
}

const HEALTH_CHECK_QUERY = gql`
  query HealthCheck {
    health
  }
`;

export const ServerWakeUp = ({ onSuccess }: ServerWakeUpProps) => {
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<'waking' | 'failed'>('waking');
  const MAX_ATTEMPTS = 6;
  const DELAY = 5000; // 5 seconds

  useEffect(() => {
    if (attempts === 0) {
      const initial_attempt = async () => {
        try {
          await apollo_client.query({
            query: HEALTH_CHECK_QUERY,
            fetchPolicy: 'network-only',
          });
          onSuccess();
        } catch {
          setAttempts(1);
        }
      };
      initial_attempt();
    }
  }, [attempts, onSuccess]);

  useEffect(() => {
    if (attempts === 0 || attempts >= MAX_ATTEMPTS) return;

    const timer = setTimeout(async () => {
      try {
        await apollo_client.query({
          query: HEALTH_CHECK_QUERY,
          fetchPolicy: 'network-only',
        });
        onSuccess();
      } catch {
        if (attempts + 1 < MAX_ATTEMPTS) {
          setAttempts((prev) => prev + 1);
        } else {
          setStatus('failed');
        }
      }
    }, DELAY);

    return () => clearTimeout(timer);
  }, [attempts, onSuccess]);

  if (status === 'failed') {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <h1 style={styles.heading}>Server Unavailable</h1>
          <p style={styles.message}>
            The backend server is not responding. Please try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={styles.button}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.spinnerWrapper}>
          <div style={styles.spinner}></div>
        </div>
        <h2 style={styles.title}>Waking up the server</h2>
        <p style={styles.subtitle}>Please wait a moment...</p>
        <div style={styles.dotsContainer}>
          {[...Array(MAX_ATTEMPTS)].map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                backgroundColor: i < attempts ? '#3b82f6' : i === attempts ? '#2563eb' : '#9ca3af',
                animation: i === attempts ? 'bounce 1s infinite' : 'none',
              }}
            />
          ))}
        </div>
        <p style={styles.attemptText}>
          Attempt {attempts + 1} of {MAX_ATTEMPTS}
        </p>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
  },
  content: {
    textAlign: 'center',
  },
  spinnerWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '2rem',
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: '4px solid var(--bg-secondary)',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
    opacity: 0.7,
  },
  dotsContainer: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: 'background-color 0.3s ease',
  },
  attemptText: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    opacity: 0.6,
  },
  heading: {
    fontSize: '1.875rem',
    fontWeight: '600',
    marginBottom: '1rem',
  },
  message: {
    fontSize: '1rem',
    marginBottom: '2rem',
    opacity: 0.7,
  },
  button: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};
