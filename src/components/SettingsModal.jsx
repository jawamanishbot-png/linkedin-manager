import { useState, useEffect } from 'react'
import { getAiConfig, saveAiConfig, isAiConfigured } from '../utils/aiUtils'
import './SettingsModal.css'

export default function SettingsModal({ onClose, onSave }) {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('claude-3-5-sonnet-20241022')
  const [maxTokens, setMaxTokens] = useState(1024)
  const [temperature, setTemperature] = useState(0.7)
  const [enabled, setEnabled] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  // Load config on mount
  useEffect(() => {
    const config = getAiConfig()
    setApiKey(config.apiKey)
    setModel(config.model)
    setMaxTokens(config.maxTokens)
    setTemperature(config.temperature)
    setEnabled(config.enabled)
  }, [])

  const handleSave = () => {
    if (enabled && !apiKey.trim()) {
      alert('Please enter your API key!')
      return
    }

    const config = {
      apiKey: apiKey.trim(),
      model,
      maxTokens,
      temperature,
      enabled,
    }

    saveAiConfig(config)
    setSaveStatus('✅ Settings saved!')
    setTimeout(() => setSaveStatus(''), 3000)
    onSave()
  }

  const isConfigured = isAiConfigured()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ AI Configuration</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {isConfigured && (
            <div className="status-badge configured">
              ✅ AI Configured & Ready
            </div>
          )}

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>Enable AI Features</span>
            </label>
            <p className="help-text">
              Enable AI to generate posts, hashtags, and more
            </p>
          </div>

          {enabled && (
            <>
              <div className="form-group">
                <label htmlFor="apiKey">Claude API Key</label>
                <div className="api-key-input-wrapper">
                  <input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="api-key-input"
                  />
                  <button
                    className="toggle-visibility"
                    onClick={() => setShowApiKey(!showApiKey)}
                    type="button"
                  >
                    {showApiKey ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <p className="help-text">
                  Get your API key from{' '}
                  <a
                    href="https://console.anthropic.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    console.anthropic.com
                  </a>
                  . Your key is stored locally only.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="model">Model</label>
                <select
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="claude-3-5-sonnet-20241022">
                    Claude 3.5 Sonnet (Recommended)
                  </option>
                  <option value="claude-3-opus-20250219">Claude 3 Opus</option>
                  <option value="claude-3-haiku-20250307">Claude 3 Haiku</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="maxTokens">Max Tokens</label>
                  <input
                    id="maxTokens"
                    type="number"
                    min="100"
                    max="4096"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                  />
                  <p className="help-text">Response length limit</p>
                </div>

                <div className="form-group">
                  <label htmlFor="temperature">Temperature</label>
                  <div className="temperature-input">
                    <input
                      id="temperature"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                    />
                    <span className="temp-value">{temperature.toFixed(1)}</span>
                  </div>
                  <p className="help-text">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>
              </div>

              <div className="info-box">
                <p>
                  <strong>💡 Note:</strong> Your API key is stored locally in
                  your browser and never sent to our servers. We only use it to
                  call Claude API directly.
                </p>
              </div>
            </>
          )}

          {!enabled && (
            <div className="info-box warning">
              <p>
                <strong>AI Features Disabled</strong>
                <br />
                Enable AI to unlock: post generation, hashtag suggestions,
                content ideas, and more.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {saveStatus && <span className="save-status">{saveStatus}</span>}
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
