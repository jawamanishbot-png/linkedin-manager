import { useState } from 'react'
import './ImageUpload.css'

export default function ImageUpload({ onImageSelect, currentImage, onRemove }) {
  const [preview, setPreview] = useState(currentImage || null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Max 5MB.')
      return
    }

    // Read file as base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result
      setPreview(base64)
      onImageSelect(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    setPreview(null)
    onRemove()
  }

  return (
    <div className="image-upload">
      {preview ? (
        <div className="image-preview">
          <img src={preview} alt="Preview" />
          <button className="remove-button" onClick={handleRemove}>
            ✕ Remove
          </button>
        </div>
      ) : (
        <label className="upload-label">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <span className="upload-icon">📷</span>
          <span className="upload-text">Click to add image</span>
        </label>
      )}
    </div>
  )
}
