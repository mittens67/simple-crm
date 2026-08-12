import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
import LoadingSpinner from '../components/ui/loading-spinner';

// This is an example integration test file showing how to test components
// with all providers (Auth, Theme, Dialog, etc.)

describe('Example Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders components with all providers', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
  });

  // Example: Testing a component that uses dialog context
  it('can use dialog hooks when rendered with providers', () => {
    // Components that use useDialog(), useAuth(), or useTheme()
    // can be safely tested here with the test-utils render function

    const TestComponent = () => {
      return <div>Test Component with Providers</div>;
    };

    render(<TestComponent />);
    expect(screen.getByText('Test Component with Providers')).toBeInTheDocument();
  });
});
