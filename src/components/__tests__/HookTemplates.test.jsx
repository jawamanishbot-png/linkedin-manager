import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HookTemplates from '../HookTemplates'

describe('HookTemplates', () => {
  it('renders collapsed toggle button initially', () => {
    render(<HookTemplates onInsertHook={vi.fn()} onInsertEnding={vi.fn()} />)
    expect(screen.getByText('Hook & CTA Templates')).toBeInTheDocument()
    expect(screen.queryByText('Hook Templates')).not.toBeInTheDocument()
  })

  it('expands when toggle is clicked', async () => {
    const user = userEvent.setup()
    render(<HookTemplates onInsertHook={vi.fn()} onInsertEnding={vi.fn()} />)

    await user.click(screen.getByText('Hook & CTA Templates'))
    expect(screen.getByText('Hook Templates')).toBeInTheDocument()
    expect(screen.getByText('CTA / Ending Templates')).toBeInTheDocument()
  })

  it('shows all category buttons when expanded', async () => {
    const user = userEvent.setup()
    render(<HookTemplates onInsertHook={vi.fn()} onInsertEnding={vi.fn()} />)

    await user.click(screen.getByText('Hook & CTA Templates'))
    expect(screen.getByText('Story')).toBeInTheDocument()
    expect(screen.getByText('Curiosity')).toBeInTheDocument()
    expect(screen.getByText('Contrarian')).toBeInTheDocument()
    expect(screen.getByText('Listicle')).toBeInTheDocument()
    expect(screen.getByText('Question')).toBeInTheDocument()
  })

  it('shows Story hooks by default', async () => {
    const user = userEvent.setup()
    render(<HookTemplates onInsertHook={vi.fn()} onInsertEnding={vi.fn()} />)

    await user.click(screen.getByText('Hook & CTA Templates'))
    expect(screen.getByText(/I made a mistake/)).toBeInTheDocument()
  })

  it('switches categories when a category button is clicked', async () => {
    const user = userEvent.setup()
    render(<HookTemplates onInsertHook={vi.fn()} onInsertEnding={vi.fn()} />)

    await user.click(screen.getByText('Hook & CTA Templates'))
    await user.click(screen.getByText('Contrarian'))
    expect(screen.getByText(/Unpopular opinion/)).toBeInTheDocument()
  })

  it('calls onInsertHook when a hook is clicked', async () => {
    const user = userEvent.setup()
    const onInsertHook = vi.fn()
    render(<HookTemplates onInsertHook={onInsertHook} onInsertEnding={vi.fn()} />)

    await user.click(screen.getByText('Hook & CTA Templates'))
    // Click first Story hook
    await user.click(screen.getByText(/I made a mistake/))
    expect(onInsertHook).toHaveBeenCalledWith('I made a mistake that cost me everything.')
  })

  it('calls onInsertEnding when an ending is clicked', async () => {
    const user = userEvent.setup()
    const onInsertEnding = vi.fn()
    render(<HookTemplates onInsertHook={vi.fn()} onInsertEnding={onInsertEnding} />)

    await user.click(screen.getByText('Hook & CTA Templates'))
    await user.click(screen.getByText(/What do you think/))
    expect(onInsertEnding).toHaveBeenCalledWith('What do you think? Drop your thoughts below.')
  })

  it('collapses when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<HookTemplates onInsertHook={vi.fn()} onInsertEnding={vi.fn()} />)

    await user.click(screen.getByText('Hook & CTA Templates'))
    expect(screen.getByText('Hook Templates')).toBeInTheDocument()

    await user.click(screen.getByText('✕'))
    expect(screen.getByText('Hook & CTA Templates')).toBeInTheDocument()
    expect(screen.queryByText('Hook Templates')).not.toBeInTheDocument()
  })

  it('shows ending templates in expanded view', async () => {
    const user = userEvent.setup()
    render(<HookTemplates onInsertHook={vi.fn()} onInsertEnding={vi.fn()} />)

    await user.click(screen.getByText('Hook & CTA Templates'))
    expect(screen.getByText(/Agree or disagree/)).toBeInTheDocument()
    expect(screen.getByText(/Share this with someone/)).toBeInTheDocument()
    expect(screen.getByText(/Follow me for more/)).toBeInTheDocument()
  })
})
