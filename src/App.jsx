import { useState, useEffect } from 'react'
import PostComposer from './components/PostComposer'
import PostList from './components/PostList'
import PostCalendar from './components/PostCalendar'
import EditPostModal from './components/EditPostModal'
import SettingsModal from './components/SettingsModal'
import { isAiConfigured } from './utils/aiUtils'
import {
  createPost,
  createDraft,
  getAllPosts,
  deletePost,
  updatePost,
  initializeSampleData,
} from './utils/postUtils'
import './App.css'

export default function App() {
  const [posts, setPosts] = useState([])
  const [editingPost, setEditingPost] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)

  // Load posts from localStorage on mount
  useEffect(() => {
    // Initialize with sample data if empty
    initializeSampleData()
    const loadedPosts = getAllPosts()
    setPosts(loadedPosts)
    // Check if AI is configured
    setAiEnabled(isAiConfigured())
  }, [])

  const handleSaveDraft = (content, image) => {
    const draft = createDraft(content, image)
    setPosts([...posts, draft])
    alert('Draft saved!')
  }

  const handleSchedulePost = (content, image, scheduledTime) => {
    const post = createPost(content, image, scheduledTime)
    setPosts([...posts, post])
    alert('Post scheduled!')
  }

  const handleEditPost = (post) => {
    setEditingPost(post)
    setShowEditModal(true)
  }

  const handleSaveEdit = (updatedPost) => {
    const updated = updatePost(updatedPost.id, updatedPost)
    setPosts(posts.map((p) => (p.id === updatedPost.id ? updated : p)))
    setShowEditModal(false)
    setEditingPost(null)
    alert('Post updated!')
  }

  const handleDeletePost = (postId) => {
    if (window.confirm('Delete this post?')) {
      deletePost(postId)
      setPosts(posts.filter((p) => p.id !== postId))
      alert('Post deleted!')
    }
  }

  const handleScheduleDraft = (draft) => {
    setEditingPost(draft)
    setShowEditModal(true)
  }

  const handleSettingsSave = () => {
    setAiEnabled(isAiConfigured())
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>💼 LinkedIn Post Manager</h1>
            <p>Schedule and manage your LinkedIn posts</p>
          </div>
          <button
            className={`settings-button ${aiEnabled ? 'enabled' : ''}`}
            onClick={() => setShowSettingsModal(true)}
            title="Configure AI"
          >
            ⚙️
            {aiEnabled && <span className="ai-indicator">✓</span>}
          </button>
        </div>
      </header>

      <div className="app-container">
        <div className="left-panel">
          <PostComposer
            onSaveDraft={handleSaveDraft}
            onSchedule={handleSchedulePost}
          />
        </div>

        <div className="right-panel">
          <PostCalendar posts={posts} onSelectDate={() => {}} />

          <PostList
            posts={posts}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onSchedule={handleScheduleDraft}
          />
        </div>
      </div>

      {showEditModal && editingPost && (
        <EditPostModal
          post={editingPost}
          onSave={handleSaveEdit}
          onCancel={() => {
            setShowEditModal(false)
            setEditingPost(null)
          }}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSettingsSave}
        />
      )}
    </div>
  )
}
