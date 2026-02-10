import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '../ToastNotification'

function TestConsumer() {
  const { showToast } = useToast()
  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error message', 'error')}>Show Error</button>
      <button onClick={() => showToast('Info message', 'info')}>Show Info</button>
      <button onClick={() => showToast('Warning message', 'warning')}>Show Warning</button>
    </div>
  )
}

describe('ToastNotification', () => {
  it('renders children without toasts initially', () => {
    render(
      <ToastProvider>
        <div>App content</div>
      </ToastProvider>
    )
    expect(screen.getByText('App content')).toBeInTheDocument()
  })

  it('shows a toast when showToast is called', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    await user.click(screen.getByText('Show Success'))
    expect(screen.getByText('Success message')).toBeInTheDocument()
  })

  it('shows toast with correct type class', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    await user.click(screen.getByText('Show Error'))
    const toast = screen.getByText('Error message').closest('.toast')
    expect(toast).toHaveClass('toast-error')
  })

  it('dismisses toast when dismiss button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    await user.click(screen.getByText('Show Info'))
    expect(screen.getByText('Info message')).toBeInTheDocument()

    await user.click(screen.getByText('\u2715'))
    expect(screen.queryByText('Info message')).not.toBeInTheDocument()
  })

  it('throws error when useToast is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useToast must be used within a ToastProvider')
    spy.mockRestore()
  })
})
