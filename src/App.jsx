import { useState, useEffect, useCallback } from 'react'
import PostComposer from './components/PostComposer'
import PostList from './components/PostList'
import PostCalendar from './components/PostCalendar'
import PostPreview from './components/PostPreview'
import ContentScore from './components/ContentScore'
import EditPostModal from './components/EditPostModal'
import SettingsModal from './components/SettingsModal'
import LinkedInAuth from './components/LinkedInAuth'
import PostHistory from './components/PostHistory'
import { hasCustomApiKey } from './utils/aiUtils'
import { getLinkedInStatus, publishToLinkedIn } from './utils/linkedinApi'
import {
  createPost,
  createDraft,
  getAllPosts,
  deletePost,
  updatePost,
  publishPost,
  initializeSampleData,
} from './utils/postUtils'
import './App.css'

export default function App() {
  const [posts, setPosts] = useState([])
  const [editingPost, setEditingPost] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [aiEnabled] = useState(true)
  const [linkedInStatus, setLinkedInStatus] = useState({ connected: false })
  const [publishing, setPublishing] = useState(null)
  const [composerContent, setComposerContent] = useState('')
  const [composerImage, setComposerImage] = useState(null)
  const [composerFirstComment, setComposerFirstComment] = useState('')

  // Check for OAuth redirect params in URL
  const checkOAuthRedirect = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('linkedin_connected') === 'true') {
      getLinkedInStatus().then(setLinkedInStatus)
      window.history.replaceState({}, '', window.location.pathname)
    }
    const error = params.get('linkedin_error')
    if (error) {
      alert(`LinkedIn connection failed: ${error}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Load posts and check LinkedIn status on mount
  useEffect(() => {
    initializeSampleData()
    const loadedPosts = getAllPosts()
    setPosts(loadedPosts)
    getLinkedInStatus().then(setLinkedInStatus)
    checkOAuthRedirect()
  }, [checkOAuthRedirect])

  const handleSaveDraft = (content, image, firstComment) => {
    const draft = createDraft(content, image, firstComment)
    setPosts([...posts, draft])
    setComposerContent('')
    setComposerImage(null)
    setComposerFirstComment('')
    alert('Draft saved!')
  }

  const handleSchedulePost = (content, image, scheduledTime, firstComment) => {
    const post = createPost(content, image, scheduledTime, firstComment)
    setPosts([...posts, post])
    setComposerContent('')
    setComposerImage(null)
    setComposerFirstComment('')
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

  const handlePublishPost = async (post) => {
    if (!linkedInStatus.connected) {
      alert('Please connect your LinkedIn account first.')
      return
    }

    if (!window.confirm('Publish this post to LinkedIn now?')) return

    setPublishing(post.id)
    try {
      await publishToLinkedIn(post.content, post.image)
      const updated = publishPost(post.id)
      setPosts(posts.map((p) => (p.id === post.id ? updated : p)))
      alert('Post published to LinkedIn!')
    } catch (err) {
      alert(`Failed to publish: ${err.message}`)
    } finally {
      setPublishing(null)
    }
  }

  const handleSettingsSave = () => {
    // AI is always enabled; settings only control custom key/model
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>💼 LinkedIn Post Manager</h1>
            <p>Schedule and manage your LinkedIn posts</p>
          </div>
          <div className="header-actions">
            <LinkedInAuth
              linkedInStatus={linkedInStatus}
              onStatusChange={setLinkedInStatus}
            />
            <button
              className="settings-button"
              onClick={() => setShowSettingsModal(true)}
              title="AI Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      <div className="app-container">
        <div className="left-panel">
          <PostComposer
            onSaveDraft={handleSaveDraft}
            onSchedule={handleSchedulePost}
            onContentChange={setComposerContent}
            onImageChange={setComposerImage}
            onFirstCommentChange={setComposerFirstComment}
            aiEnabled={aiEnabled}
          />
        </div>

        <div className="right-panel">
          <PostPreview content={composerContent} image={composerImage} />
          <ContentScore content={composerContent} firstComment={composerFirstComment} />
          <PostCalendar posts={posts} onSelectDate={() => {}} />

          <PostHistory linkedInConnected={linkedInStatus.connected} />

          <PostList
            posts={posts}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onSchedule={handleScheduleDraft}
            onPublish={handlePublishPost}
            linkedInConnected={linkedInStatus.connected}
            publishingId={publishing}
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
