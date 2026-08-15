import '@testing-library/jest-dom';

declare global {
  namespace Vi {
    type Assertion<T = void> = CustomMatchers<T>;
    type AsymmetricMatchersContaining = CustomMatchers<void>;
  }
}

interface CustomMatchers<R = void> {
  toBeInTheDocument(): R;
  toBeVisible(): R;
  toBeEmptyDOMElement(): R;
  toBeDisabled(): R;
  toBeEnabled(): R;
  toBeInvalid(): R;
  toBeRequired(): R;
  toBeValid(): R;
  toContainElement(element: HTMLElement | SVGElement | null): R;
  toContainHTML(html: string): R;
  toHaveAttribute(attr: string, value?: string): R;
  toHaveClass(className: string): R;
  toHaveFocus(): R;
  toHaveFormValues(values: Record<string, string | number | boolean>): R;
  toHaveStyle(css: string | Record<string, string>): R;
  toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R;
  toHaveValue(value: string | number | string[]): R;
  toBePartiallyChecked(): R;
  toHaveErrorMessage(message: string): R;
}
