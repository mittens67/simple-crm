import { Compass } from 'lucide-react';
import { ButtonLink, EmptyState } from '../../components/ui';

/**
 * The catch-all route. Previously an unknown URL rendered a blank dashboard
 * shell with no indication that anything was wrong.
 */
const NotFound = () => (
  <div className="not-found">
    <EmptyState
      icon={<Compass />}
      title="Page not found"
      description="That URL does not match anything in the app."
      action={
        <ButtonLink to="/" variant="primary">
          Back to dashboard
        </ButtonLink>
      }
    />
  </div>
);

export default NotFound;
