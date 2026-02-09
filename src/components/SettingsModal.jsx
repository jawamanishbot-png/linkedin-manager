import { useState, useEffect } from 'react'
import { getAiConfig, saveAiConfig, hasCustomApiKey } from '../utils/aiUtils'
import './SettingsModal.css'

export default function SettingsModal({ onClose, onSave }) {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('claude-3-5-sonnet-20241022')
  const [maxTokens, setMaxTokens] = useState(1024)
  const [temperature, setTemperature] = useState(0.7)
  const [saveStatus, setSaveStatus] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showCustomConfig, setShowCustomConfig] = useState(false)

  // Load config on mount
  useEffect(() => {
    const config = getAiConfig()
    setApiKey(config.apiKey)
    setModel(config.model)
    setMaxTokens(config.maxTokens)
    setTemperature(config.temperature)
    setShowCustomConfig(config.apiKey.length > 0)
  }, [])

  const handleSave = () => {
    const config = {
      apiKey: apiKey.trim(),
      model,
      maxTokens,
      temperature,
      enabled: true,
    }

    saveAiConfig(config)
    setSaveStatus('Settings saved!')
    setTimeout(() => setSaveStatus(''), 3000)
    onSave()
  }

  const handleResetToDefault = () => {
    setApiKey('')
    setModel('claude-3-5-sonnet-20241022')
    setMaxTokens(1024)
    setTemperature(0.7)
    setShowCustomConfig(false)

    saveAiConfig({
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1024,
      temperature: 0.7,
      enabled: true,
    })
    setSaveStatus('Reset to defaults!')
    setTimeout(() => setSaveStatus(''), 3000)
    onSave()
  }

  const usingCustomKey = hasCustomApiKey()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI Settings</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className={`status-badge ${usingCustomKey ? 'custom' : 'configured'}`}>
            {usingCustomKey
              ? 'Using your custom API key'
              : 'AI enabled with default model'}
          </div>

          {!showCustomConfig ? (
            <div className="info-box">
              <p>
                AI features are enabled by default. You can optionally configure
                your own API key and model preferences.
              </p>
              <button
                className="btn btn-link"
                onClick={() => setShowCustomConfig(true)}
              >
                Use your own API key
              </button>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="apiKey">Claude API Key (optional)</label>
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

              <button
                className="btn btn-link reset-link"
                onClick={handleResetToDefault}
              >
                Reset to defaults
              </button>
            </>
          )}
        </div>

        <div className="modal-footer">
          {saveStatus && <span className="save-status">{saveStatus}</span>}
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {showCustomConfig && (
            <button className="btn btn-primary" onClick={handleSave}>
              Save Settings
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
