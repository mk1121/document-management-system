import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';
import { vi, describe, it, expect } from 'vitest';

// Test component to trigger toasts
const TestComponent = () => {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast('Success Message', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error Message', 'error')}>Show Error</button>
    </div>
  );
};

describe('Toast Component', () => {
  it('renders children correctly', () => {
    render(
      <ToastProvider>
        <div>Test Child</div>
      </ToastProvider>,
    );
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('shows toast when showToast is called', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    await user.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success Message')).toBeInTheDocument();
  });

  it('removes toast when close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    await user.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success Message')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(screen.queryByText('Success Message')).not.toBeInTheDocument();
  });

  it('auto removes toast after 4 seconds', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    const button = screen.getByText('Show Success');
    // Using fireEvent to avoid async userEvent issues with fake timers
    fireEvent.click(button);

    expect(screen.getByText('Success Message')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Success Message')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
