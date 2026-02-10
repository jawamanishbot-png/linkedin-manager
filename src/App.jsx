import { useState, useEffect, useCallback } from 'react'
import { Analytics } from '@vercel/analytics/react'
import PostComposer from './components/PostComposer'
import PostList from './components/PostList'
import PostCalendar from './components/PostCalendar'
import EditPostModal from './components/EditPostModal'
import SettingsModal from './components/SettingsModal'
import LinkedInAuth from './components/LinkedInAuth'
import PostHistory from './components/PostHistory'
import { ToastProvider, useToast } from './components/ToastNotification'
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

function AppContent() {
  const [posts, setPosts] = useState([])
  const [editingPost, setEditingPost] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [linkedInStatus, setLinkedInStatus] = useState({ connected: false })
  const [publishing, setPublishing] = useState(null)
  // Lifted composer state
  const [composerContent, setComposerContent] = useState('')
  const [composerImage, setComposerImage] = useState(null)
  const [composerFirstComment, setComposerFirstComment] = useState('')

  // AI preview state
  const [aiPreview, setAiPreview] = useState(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // Content history for undo
  const [contentHistory, setContentHistory] = useState([])

  const { showToast } = useToast()

  const pushHistory = useCallback((text) => {
    if (text.trim()) {
      setContentHistory(prev => {
        const next = [...prev, text]
        return next.length > 20 ? next.slice(-20) : next
      })
    }
  }, [])

  const handleUndo = useCallback(() => {
    setContentHistory(prev => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const last = next.pop()
      setComposerContent(last)
      return next
    })
  }, [])

  // Check for OAuth redirect params
  const checkOAuthRedirect = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('linkedin_connected') === 'true') {
      getLinkedInStatus().then(setLinkedInStatus)
      window.history.replaceState({}, '', window.location.pathname)
    }
    const error = params.get('linkedin_error')
    if (error) {
      showToast(`LinkedIn connection failed: ${error}`, 'error')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [showToast])

  useEffect(() => {
    initializeSampleData()
    const loadedPosts = getAllPosts()
    setPosts(loadedPosts)
    getLinkedInStatus().then(setLinkedInStatus)
    checkOAuthRedirect()
  }, [checkOAuthRedirect])

  // AI result handler — shows preview instead of replacing content immediately
  const handleAiResult = useCallback((result, label, retryFn) => {
    setAiPreview({ content: result, label, retryFn })
  }, [])

  const handleAcceptAi = useCallback(() => {
    if (aiPreview) {
      pushHistory(composerContent)
      setComposerContent(aiPreview.content)
      setAiPreview(null)
    }
  }, [aiPreview, composerContent, pushHistory])

  const handleDiscardAi = useCallback(() => {
    setAiPreview(null)
  }, [])

  const handleRetryAi = useCallback(async () => {
    if (aiPreview?.retryFn) {
      setIsRetrying(true)
      try {
        const result = await aiPreview.retryFn()
        setAiPreview(prev => ({ ...prev, content: result }))
      } catch (err) {
        showToast(err.message || 'Retry failed', 'error')
      } finally {
        setIsRetrying(false)
      }
    }
  }, [aiPreview, showToast])

  // First comment AI result
  const handleFirstCommentResult = useCallback((comment) => {
    setComposerFirstComment(comment)
    showToast('First comment generated!', 'success')
  }, [showToast])

  // Hook/ending/template insertion
  const handleInsertHook = useCallback((hook) => {
    pushHistory(composerContent)
    const newContent = composerContent ? `${hook}\n\n${composerContent}` : hook
    if (newContent.length <= 3000) {
      setComposerContent(newContent)
    }
  }, [composerContent, pushHistory])

  const handleInsertEnding = useCallback((ending) => {
    pushHistory(composerContent)
    const newContent = composerContent ? `${composerContent}\n\n${ending}` : ending
    if (newContent.length <= 3000) {
      setComposerContent(newContent)
    }
  }, [composerContent, pushHistory])

  const handleInsertTemplate = useCallback((template) => {
    pushHistory(composerContent)
    setComposerContent(template)
    showToast('Template inserted! Fill in the [brackets].', 'info')
  }, [composerContent, pushHistory, showToast])

  // Post actions
  const handleSaveDraft = useCallback(() => {
    const draft = createDraft(composerContent, composerImage, composerFirstComment)
    setPosts(prev => [...prev, draft])
    setComposerContent('')
    setComposerImage(null)
    setComposerFirstComment('')
    setContentHistory([])
  }, [composerContent, composerImage, composerFirstComment])

  const handleSchedulePost = useCallback((scheduledTime) => {
    const post = createPost(composerContent, composerImage, scheduledTime, composerFirstComment)
    setPosts(prev => [...prev, post])
    setComposerContent('')
    setComposerImage(null)
    setComposerFirstComment('')
    setContentHistory([])
    showToast('Post scheduled!', 'success')
  }, [composerContent, composerImage, composerFirstComment, showToast])

  const handleEditPost = (post) => {
    setEditingPost(post)
    setShowEditModal(true)
  }

  const handleSaveEdit = (updatedPost) => {
    const updated = updatePost(updatedPost.id, updatedPost)
    setPosts(posts.map((p) => (p.id === updatedPost.id ? updated : p)))
    setShowEditModal(false)
    setEditingPost(null)
    showToast('Post updated!', 'success')
  }

  const handleDeletePost = (postId) => {
    if (window.confirm('Delete this post?')) {
      deletePost(postId)
      setPosts(posts.filter((p) => p.id !== postId))
      showToast('Post deleted', 'info')
    }
  }

  const handleScheduleDraft = (draft) => {
    setEditingPost(draft)
    setShowEditModal(true)
  }

  const handlePublishPost = async (post) => {
    if (!linkedInStatus.connected) {
      showToast('Please connect your LinkedIn account first.', 'warning')
      return
    }

    if (!window.confirm('Publish this post to LinkedIn now?')) return

    setPublishing(post.id)
    try {
      await publishToLinkedIn(post.content, post.image)
      const updated = publishPost(post.id)
      setPosts(posts.map((p) => (p.id === post.id ? updated : p)))
      showToast('Post published to LinkedIn!', 'success')
    } catch (err) {
      showToast(`Failed to publish: ${err.message}`, 'error')
    } finally {
      setPublishing(null)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>LinkedIn Post Manager</h1>
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
              Settings
            </button>
          </div>
        </div>
      </header>

      <div className="app-layout">
        <PostComposer
          content={composerContent}
          image={composerImage}
          firstComment={composerFirstComment}
          onContentChange={setComposerContent}
          onImageChange={setComposerImage}
          onFirstCommentChange={setComposerFirstComment}
          onSaveDraft={handleSaveDraft}
          onSchedule={handleSchedulePost}
          aiPreview={aiPreview}
          onAcceptAi={handleAcceptAi}
          onDiscardAi={handleDiscardAi}
          onRetryAi={handleRetryAi}
          isRetrying={isRetrying}
          canUndo={contentHistory.length > 0}
          onUndo={handleUndo}
          onAiResult={handleAiResult}
          onInsertHook={handleInsertHook}
          onInsertEnding={handleInsertEnding}
          onInsertTemplate={handleInsertTemplate}
          onFirstCommentResult={handleFirstCommentResult}
        />
      </div>

      <div className="app-below-composer">
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
          onSave={() => {}}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
      <Analytics />
    </ToastProvider>
  )
}
