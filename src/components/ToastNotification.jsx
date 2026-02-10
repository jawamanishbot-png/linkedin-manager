import { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './ToastNotification.css'

const ToastContext = createContext(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const effectiveDuration = type === 'error' ? Math.max(duration, 5000) : duration

    setToasts(prev => {
      const next = [...prev, { id, message, type, duration: effectiveDuration }]
      return next.length > 3 ? next.slice(-3) : next
    })

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, effectiveDuration)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span className="toast-message">{toast.message}</span>
              <button
                className="toast-dismiss"
                onClick={() => dismissToast(toast.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
