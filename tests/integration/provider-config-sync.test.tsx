/**
 * Regression test for the render-time store update in ChatProvider.
 *
 * The bug: ChatProvider synced a changed `config` prop into the engine from
 * the render body. `updateConfig` ends in `emit()`, which notifies every
 * useSyncExternalStore subscriber, so a config change updated other components
 * while ChatProvider was still rendering. React logged "Cannot update a
 * component while rendering a different component", and the store read could
 * tear.
 *
 * Callers hit this routinely: a config built inline or in a useMemo gets a new
 * identity whenever any of its deps change — a locale, for instance.
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import * as React from 'react'
import { ChatProvider, useChat } from '../../src/index.js'
import type { ChatConfig } from '../../src/types/chat.js'

function makeConfig(systemPrompt: string): ChatConfig {
  return {
    provider: {
      kind: 'openai-compatible',
      baseUrl: '/api/ai',
      chatPath: '/chat/completions',
      credentials: { apiKey: '' },
    },
    model: { id: 'auto' },
    systemPrompt,
    persistKey: false,
  } as ChatConfig
}

function Probe() {
  const chat = useChat()
  return <span data-testid="prompt">{chat.config.systemPrompt}</span>
}

afterEach(() => vi.restoreAllMocks())

describe('ChatProvider — config sync', () => {
  it('does not update other components while rendering', () => {
    const errors: string[] = []
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    })

    function Harness({ prompt }: { prompt: string }) {
      return (
        <ChatProvider config={makeConfig(prompt)}>
          <Probe />
        </ChatProvider>
      )
    }

    const { rerender } = render(<Harness prompt="first" />)
    // A new config object on every render is the realistic case.
    act(() => rerender(<Harness prompt="second" />))
    act(() => rerender(<Harness prompt="third" />))

    expect(
      errors.filter((e) => e.includes('Cannot update a component')),
    ).toEqual([])
  })

  it('still applies a changed config to the engine', () => {
    function Harness({ prompt }: { prompt: string }) {
      return (
        <ChatProvider config={makeConfig(prompt)}>
          <Probe />
        </ChatProvider>
      )
    }

    const { rerender, getByTestId } = render(<Harness prompt="first" />)
    expect(getByTestId('prompt').textContent).toBe('first')

    act(() => rerender(<Harness prompt="second" />))
    expect(getByTestId('prompt').textContent).toBe('second')
  })
})
