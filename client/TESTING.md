# Frontend Testing Guide

This project uses **Vitest** for unit and component testing, combined with **React Testing Library** for testing React components.

## Running Tests

```bash
# Run tests in watch mode (development)
npm run test

# Run tests once (CI mode)
npm run test -- --run

# Run tests with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Structure

Tests should be placed in the same directory as the component they test, with the `.test.tsx` suffix:

```
src/
  components/
    ui/
      button.tsx
      button.test.tsx
```

## Writing Tests

### Component Tests

Use React Testing Library to test components from a user's perspective:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);
    
    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

### Testing Best Practices

1. **Test user behavior, not implementation** - Focus on what users see and do
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Use `userEvent` over `fireEvent`** - More realistic user interactions
4. **Avoid testing internal state** - Test through props and output
5. **Use `data-testid` sparingly** - Only when semantic queries won't work

### Common Patterns

#### Testing async operations

```typescript
it('loads data', async () => {
  const user = userEvent.setup();
  render(<DataComponent />);
  
  const button = screen.getByRole('button', { name: /load/i });
  await user.click(button);
  
  const result = await screen.findByText('Data loaded');
  expect(result).toBeInTheDocument();
});
```

#### Testing with mocks

```typescript
it('handles errors', async () => {
  const mockOnError = vi.fn();
  render(<MyComponent onError={mockOnError} />);
  
  // Trigger error condition
  await userEvent.click(screen.getByRole('button'));
  
  expect(mockOnError).toHaveBeenCalled();
});
```

#### Testing with providers

```typescript
it('works with context', () => {
  render(
    <AuthProvider>
      <MyComponent />
    </AuthProvider>
  );
  
  expect(screen.getByText('User authenticated')).toBeInTheDocument();
});
```

## Testing Dialogs

Dialog components should be tested for:
- Rendering with correct content
- User interactions (button clicks)
- Callback functions being called

```typescript
describe('ConfirmDialog', () => {
  it('calls onConfirm when button clicked', async () => {
    const user = userEvent.setup();
    const mockOnConfirm = vi.fn();
    
    render(
      <ConfirmDialog
        title="Confirm?"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={vi.fn()}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(mockOnConfirm).toHaveBeenCalledOnce();
  });
});
```

## Useful Queries

- `getByRole` - Semantic elements (buttons, links, headings)
- `getByLabelText` - Form inputs by their labels
- `getByText` - Elements by text content
- `getByTestId` - Elements with `data-testid` attribute
- `queryBy*` - Returns null if not found (use for checking absence)
- `findBy*` - Async version (for elements that appear later)

## Debugging Tests

```typescript
// Print the DOM to console
const { debug } = render(<MyComponent />);
debug();

// Use screen.logTestingPlaygroundURL() to get a testing-library code generator
```

## Resources

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Docs](https://vitest.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
