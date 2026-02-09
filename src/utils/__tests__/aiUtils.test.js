import { describe, it, expect, beforeEach } from 'vitest'
import { getAiConfig, saveAiConfig, isAiConfigured } from '../aiUtils'

const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('aiUtils config functions', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('returns default config when nothing is saved', () => {
    const config = getAiConfig()
    expect(config.apiKey).toBe('')
    expect(config.model).toBe('claude-3-5-sonnet-20241022')
    expect(config.maxTokens).toBe(1024)
    expect(config.temperature).toBe(0.7)
    expect(config.enabled).toBe(false)
  })

  it('saves and retrieves config', () => {
    const config = {
      apiKey: 'sk-test-key',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 2048,
      temperature: 0.5,
      enabled: true,
    }
    saveAiConfig(config)
    const retrieved = getAiConfig()
    expect(retrieved.apiKey).toBe('sk-test-key')
    expect(retrieved.maxTokens).toBe(2048)
    expect(retrieved.temperature).toBe(0.5)
    expect(retrieved.enabled).toBe(true)
  })

  it('saveAiConfig returns true on success', () => {
    expect(saveAiConfig({ apiKey: 'test', enabled: true })).toBe(true)
  })

  it('isAiConfigured returns false when not enabled', () => {
    saveAiConfig({ apiKey: 'sk-test', model: 'test', maxTokens: 1024, temperature: 0.7, enabled: false })
    expect(isAiConfigured()).toBe(false)
  })

  it('isAiConfigured returns false when no API key', () => {
    saveAiConfig({ apiKey: '', model: 'test', maxTokens: 1024, temperature: 0.7, enabled: true })
    expect(isAiConfigured()).toBe(false)
  })

  it('isAiConfigured returns true when enabled with API key', () => {
    saveAiConfig({ apiKey: 'sk-test', model: 'test', maxTokens: 1024, temperature: 0.7, enabled: true })
    expect(isAiConfigured()).toBe(true)
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('linkedinAiConfig', 'not-valid-json{{{')
    const config = getAiConfig()
    expect(config.apiKey).toBe('')
    expect(config.enabled).toBe(false)
  })
})
