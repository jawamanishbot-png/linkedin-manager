# PostComposer Redesign - Implementation Plan

## Overview

Redesign the LinkedIn Manager's PostComposer from a vertically-stacked panel layout into an editor-first design with a consolidated AI sidebar, content history, accept/discard workflow, and toast notifications. Inspired by Notion AI, Typefully, Buffer, and LinkedIn native composer.

---

## Current State Summary

### File inventory (to be modified or deprecated)

| File | Role | Fate |
|------|------|------|
| `src/components/PostComposer.jsx` | Main composer | **Redesign** |
| `src/components/HookTemplates.jsx` | 25 hooks + 8 endings | **Deprecate** (merge into AiSidebar) |
| `src/components/ViralFrameworks.jsx` | 10 AI framework chips | **Deprecate** (merge into AiSidebar) |
| `src/components/AiAssistant.jsx` | AI improve/rewrite/generate | **Deprecate** (merge into AiSidebar) |
| `src/components/FormattingToolbar.jsx` | Bold, italic, lists | **Keep** (no changes) |
| `src/components/PostPreview.jsx` | LinkedIn preview | **Keep** (relocate into sidebar) |
| `src/components/ContentScore.jsx` | Quality score ring | **Keep** (relocate into sidebar) |
| `src/App.jsx` | Two-column layout | **Modify** (full-width + sidebar) |
| `src/utils/aiUtils.js` | AI API functions | **Keep** (no changes) |
| `src/data/viralFrameworks.js` | Framework definitions | **Keep** (imported by AiSidebar) |

### Current problems being solved

1. Three overlapping AI panels with confusing distinctions
2. No undo -- AI destructively replaces content with no way back
3. No accept/discard flow for AI output
4. Action buttons (Save/Schedule/Clear) pushed off-screen when panels expand
5. Two redundant "Generate Post" paths (AiAssistant + ViralFrameworks)
6. Mobile preview unreachable below long composer
7. `alert()` calls for all validation and success messages
8. Hashtags blindly appended to post body

---

## Architecture After Redesign

```
App.jsx
  |
  +-- header (unchanged)
  |
  +-- app-container (redesigned layout)
  |     |
  |     +-- main-editor-area (takes full width or shares with sidebar)
  |     |     |
  |     |     +-- PostComposer.jsx (redesigned)
  |     |           |
  |     |           +-- FormattingToolbar (unchanged)
  |     |           +-- textarea (larger, editor-first)
  |     |           +-- char count
  |     |           +-- AiOutputPreview.jsx (NEW - overlay when AI generates)
  |     |           +-- ImageUpload (unchanged)
  |     |           +-- first comment textarea
  |     |           +-- schedule section
  |     |           +-- STICKY bottom action bar (Clear / Save Draft / Schedule)
  |     |
  |     +-- AiSidebar.jsx (NEW - collapsible right sidebar)
  |           |
  |           +-- Tab: "Generate" (frameworks + topic generation)
  |           +-- Tab: "Refine" (improve, rewrite, shorten, hashtags, first comment)
  |           +-- Tab: "Templates" (hooks + endings)
  |           +-- Tab: "Preview" (PostPreview + ContentScore)
  |
  +-- ToastNotification.jsx (NEW - portal, app-level)
  |
  +-- PostCalendar, PostHistory, PostList (unchanged, below composer)
```

---

## Step 1: ToastNotification Component

**New files:**
- `src/components/ToastNotification.jsx`
- `src/components/ToastNotification.css`

### Purpose
Replace all `alert()` calls with auto-dismissing toast notifications. This is standalone with zero dependencies on other new components, so it ships first.

### Component API

```jsx
// ToastNotification.jsx
// Renders a fixed-position toast stack via React portal (into document.body)

export function ToastProvider({ children })
// Wraps the app. Provides toast context to all descendants.
// Maintains an internal array of active toasts: { id, message, type, duration }

export function useToast()
// Custom hook returning: { showToast(message, type?, duration?) }
// type: 'success' | 'error' | 'warning' | 'info' (default: 'info')
// duration: ms before auto-dismiss (default: 3000, errors: 5000)

// Internal: ToastContainer component renders the visible toast stack
```

### State shape

```js
// Internal to ToastProvider
const [toasts, setToasts] = useState([])
// Each toast: { id: crypto.randomUUID(), message: string, type: string, duration: number }
```

### Key implementation details

- Use `React.createContext` for the toast context
- `ToastProvider` wraps the app in `App.jsx` (or `main.jsx`)
- `ToastContainer` renders as a React portal into `document.body`
- Toasts stack from bottom-right, newest on top
- Each toast auto-dismisses after `duration` ms via `useEffect` + `setTimeout`
- Toasts have a close button for manual dismissal
- CSS transitions: slide-in from right, fade-out on dismiss
- Maximum 3 visible toasts; oldest auto-dismissed when exceeded

### CSS structure

```css
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none; /* container doesn't block clicks */
}

.toast {
  pointer-events: auto; /* individual toasts are clickable */
  min-width: 300px;
  max-width: 420px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 10px;
  animation: toast-slide-in 0.3s ease;
}

.toast-success { background: #f0fdf4; border-left: 4px solid #16a34a; color: #15803d; }
.toast-error   { background: #fef2f2; border-left: 4px solid #dc2626; color: #b91c1c; }
.toast-warning { background: #fffbeb; border-left: 4px solid #ca8a04; color: #a16207; }
.toast-info    { background: #eff6ff; border-left: 4px solid #0a66c2; color: #1e40af; }

.toast-dismiss {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.6;
}

@keyframes toast-slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
```

### Files changed after this step
- `src/components/ToastNotification.jsx` (new)
- `src/components/ToastNotification.css` (new)

---

## Step 2: AiOutputPreview Component

**New files:**
- `src/components/AiOutputPreview.jsx`
- `src/components/AiOutputPreview.css`

### Purpose
When AI generates or modifies content, the result appears in this overlay/inline preview area instead of being injected directly into the textarea. The user explicitly accepts, discards, or retries. This solves the destructive-replacement problem.

### Component API

```jsx
export default function AiOutputPreview({
  originalContent,   // string - current textarea content before AI ran
  aiContent,         // string - the AI-generated result
  actionLabel,       // string - e.g. "Improved Post", "Rewritten (Casual)", "Generated Post"
  onAccept,          // () => void - apply aiContent to textarea
  onDiscard,         // () => void - keep originalContent, close preview
  onRetry,           // () => void - re-run the same AI action
  isRetrying,        // boolean - show spinner on retry button
})
```

### Layout

```
+-----------------------------------------------+
| AI Result: {actionLabel}              [Retry]  |
+-----------------------------------------------+
|                                                |
|  {aiContent displayed in a styled read-only    |
|   area with a subtle background tint}          |
|                                                |
+-----------------------------------------------+
| [Discard]                      [Accept Changes]|
+-----------------------------------------------+
```

### Key implementation details

- Renders as an overlay card that appears between the textarea and the action buttons
- The main textarea becomes visually dimmed (not disabled) while the preview is active
- `aiContent` is displayed in a read-only `<div>` styled to look like the textarea, with a light blue-tinted background (`#f0f7ff`)
- Accept button: calls `onAccept`, which in PostComposer pushes current content to history stack, then sets content to `aiContent`
- Discard button: calls `onDiscard`, which simply closes the preview with no content change
- Retry button: calls `onRetry` with a spinner; when new result arrives, `aiContent` prop updates
- If `originalContent` is empty (pure generation, not a refinement), hide the Discard button label and show "Start Over" instead
- The preview area scrolls if content exceeds ~200px height
- Pressing Escape triggers `onDiscard`

### CSS structure

```css
.ai-output-preview {
  border: 2px solid #0a66c2;
  border-radius: 8px;
  background: #f8fbff;
  margin: 12px 0;
  overflow: hidden;
}

.ai-output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #e9f2ff;
  border-bottom: 1px solid #d0e2ff;
  font-weight: 600;
  font-size: 0.9rem;
  color: #0a66c2;
}

.ai-output-body {
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #333;
}

.ai-output-actions {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #e0e8ff;
  gap: 12px;
}

.ai-output-actions .btn-accept {
  background: #0a66c2;
  color: white;
  /* primary action style */
}

.ai-output-actions .btn-discard {
  background: #f0f0f0;
  color: #333;
}

.ai-output-actions .btn-retry {
  background: none;
  border: 1px solid #0a66c2;
  color: #0a66c2;
}
```

### Interaction with PostComposer state

The `AiOutputPreview` is a pure presentational component. All state management (storing the AI result, triggering accept/discard) lives in PostComposer. PostComposer will hold:

```js
const [aiPreview, setAiPreview] = useState(null)
// When set: { aiContent: string, actionLabel: string, retryFn: () => Promise<string> }
// When null: no preview shown
```

### Files changed after this step
- `src/components/AiOutputPreview.jsx` (new)
- `src/components/AiOutputPreview.css` (new)

---

## Step 3: AiSidebar Component

**New files:**
- `src/components/AiSidebar.jsx`
- `src/components/AiSidebar.css`

### Purpose
Consolidate HookTemplates, ViralFrameworks, and AiAssistant into a single tabbed sidebar. This becomes the one place for all AI and template functionality.

### Component API

```jsx
export default function AiSidebar({
  content,              // string - current post content (for refine actions)
  composerImage,        // string|null - current image (for preview tab)
  firstComment,         // string - current first comment (for preview tab content score)
  onAiResult,           // (aiContent, actionLabel, retryFn) => void - triggers AiOutputPreview in PostComposer
  onInsertHook,         // (hook: string) => void - prepend hook to content
  onInsertEnding,       // (ending: string) => void - append ending to content
  onFirstCommentResult, // (comment: string) => void - set first comment from AI
  isOpen,               // boolean - controlled open/close from App
  onToggle,             // () => void - toggle sidebar visibility
})
```

### Tab structure

**Tab 1: "Generate"** - Merges ViralFrameworks + AiAssistant's generate feature

```
+-- Topic input field
+-- [Generate Post] [Get Ideas] buttons
+-- Ideas display area (if generated)
+-- Divider: "Or use a framework:"
+-- Framework chips grid (10 frameworks from VIRAL_FRAMEWORKS)
+-- Selected framework detail (description + topic input + generate button)
```

State:
```js
const [topicInput, setTopicInput] = useState('')
const [selectedFramework, setSelectedFramework] = useState(null)
const [frameworkTopic, setFrameworkTopic] = useState('')
const [postIdeas, setPostIdeas] = useState('')
const [loading, setLoading] = useState(false)
const [activeAction, setActiveAction] = useState(null)
const [error, setError] = useState('')
```

AI functions used:
- `generatePost(topic)` from `aiUtils.js` -- plain topic generation
- `generatePostIdeas(topic)` from `aiUtils.js` -- idea brainstorming
- `generateFromFramework(topic, systemPrompt)` from `aiUtils.js` -- framework-based generation

Key behavior change: Instead of calling `onContentUpdate` directly (which destructively replaces), all generation results go through `onAiResult(result, label, retryFn)`, which triggers the AiOutputPreview in PostComposer.

**Tab 2: "Refine"** - Merges AiAssistant's refine features

```
+-- Quick action buttons (styled as chips/pills):
    - "Improve Post" (existing improvePost)
    - "Make it Punchier" (new: improvePost with custom prompt)
    - "Shorten" (new: rewritePost with 'concise' tone)
    - "Add a Hook" (new: improvePost variant focused on opening line)
+-- "Change Tone" expandable section with tone buttons:
    - Professional, Casual, Inspirational, Storytelling, Humorous
+-- "Add Hashtags" button
    - NEW BEHAVIOR: Hashtags generated and shown in AiOutputPreview as a suggestion
      appended to content, not blindly injected
+-- "Suggest First Comment" button
    - This one still directly sets the first comment field (no preview needed since
      it doesn't modify the main post content)
```

State:
```js
const [showToneMenu, setShowToneMenu] = useState(false)
const [loading, setLoading] = useState(false)
const [activeAction, setActiveAction] = useState(null)
const [error, setError] = useState('')
```

AI functions used:
- `improvePost(content)` from `aiUtils.js`
- `rewritePost(content, tone)` from `aiUtils.js`
- `generateHashtags(content)` from `aiUtils.js`
- `generateFirstComment(content)` from `aiUtils.js`

All content-modifying actions (improve, rewrite, shorten, add hook, hashtags) route through `onAiResult` for the accept/discard flow. Only `generateFirstComment` directly calls `onFirstCommentResult`.

New "named one-click actions" implementation:

| Button Label | AI Function | Details |
|---|---|---|
| "Improve Post" | `improvePost(content)` | Existing function, no change |
| "Make it Punchier" | `rewritePost(content, 'punchy')` | New tone value; the prompt in `rewritePost` already accepts any tone string |
| "Shorten" | `rewritePost(content, 'concise')` | Uses existing `rewritePost` with 'concise' tone |
| "Add a Hook" | `improvePost(content)` with modified prompt | Or a new `addHook(content)` utility function in `aiUtils.js` if we want a dedicated prompt. Decision: use `rewritePost(content, 'hook-focused')` for now and if the results aren't good enough, add a dedicated function later. |

**Tab 3: "Templates"** - Moves HookTemplates content here

```
+-- Hook category tabs: Story, Curiosity, Contrarian, Listicle, Question
+-- Hook items list (clickable to prepend)
+-- Divider
+-- CTA / Ending items list (clickable to append)
```

This tab contains NO AI calls. It is purely static data. The HOOKS and ENDINGS arrays from HookTemplates.jsx are moved here (or imported from a new `src/data/hookTemplates.js` data file for separation of concerns).

Clicking a hook calls `onInsertHook(hookText)`. Clicking an ending calls `onInsertEnding(endingText)`. These prepend/append directly without going through AiOutputPreview (since they are small, predictable additions, not AI-generated replacements).

**Tab 4: "Preview"** - Relocates PostPreview + ContentScore

```
+-- PostPreview component (existing, unchanged)
+-- ContentScore component (existing, unchanged)
```

Simply renders `<PostPreview content={content} image={composerImage} />` and `<ContentScore content={content} firstComment={firstComment} />`.

### Sidebar layout and toggle

- The sidebar slides in from the right when opened
- Toggle button is a small floating button on the right edge of the composer area (or in the formatting toolbar area)
- Sidebar width: `380px` on desktop, full-width overlay on mobile (<768px)
- Sidebar has a close button (X) in the top-right corner
- Tabs are rendered as a horizontal tab bar at the top of the sidebar
- Active tab has a bottom border indicator (LinkedIn-style)

### CSS structure

```css
.ai-sidebar {
  width: 380px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 160px);
  position: sticky;
  top: 20px;
}

.ai-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.ai-sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 8px;
}

.ai-sidebar-tab {
  flex: 1;
  padding: 10px 8px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
  text-align: center;
}

.ai-sidebar-tab.active {
  color: #0a66c2;
  border-bottom-color: #0a66c2;
  font-weight: 600;
}

.ai-sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Collapsed state: sidebar not rendered, toggle button shown instead */
.ai-sidebar-toggle {
  position: fixed; /* or absolute relative to composer container */
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  background: #0a66c2;
  color: white;
  border: none;
  border-radius: 8px 0 0 8px;
  padding: 12px 8px;
  cursor: pointer;
  writing-mode: vertical-rl;
  font-size: 0.85rem;
  z-index: 10;
}

@media (max-width: 768px) {
  .ai-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    z-index: 1000;
  }
}
```

### Data extraction: new file for hook/ending templates

Create `src/data/hookTemplates.js` to hold the HOOKS and ENDINGS arrays currently hardcoded in HookTemplates.jsx. This keeps data separate from presentation and allows AiSidebar's Templates tab to import them cleanly.

```js
// src/data/hookTemplates.js
export const HOOKS = [
  { category: 'Story', hooks: [ /* ... existing 5 hooks ... */ ] },
  { category: 'Curiosity', hooks: [ /* ... */ ] },
  { category: 'Contrarian', hooks: [ /* ... */ ] },
  { category: 'Listicle', hooks: [ /* ... */ ] },
  { category: 'Question', hooks: [ /* ... */ ] },
]

export const ENDINGS = [
  'What do you think? Drop your thoughts below.',
  // ... existing 8 endings ...
]
```

### Files changed after this step
- `src/components/AiSidebar.jsx` (new)
- `src/components/AiSidebar.css` (new)
- `src/data/hookTemplates.js` (new -- extracted from HookTemplates.jsx)

---

## Step 4: PostComposer Redesign

**Modified file:** `src/components/PostComposer.jsx`
**Modified file:** `src/components/PostComposer.css`

### Changes overview

1. Remove imports of HookTemplates, ViralFrameworks, AiAssistant
2. Add content history stack for undo
3. Add `aiPreview` state for the accept/discard flow
4. Make the bottom action bar sticky
5. Replace all `alert()` calls with `useToast()`
6. Wire up callbacks for AiSidebar integration

### New state additions

```js
// Content history for undo (array of previous content strings)
const [contentHistory, setContentHistory] = useState([])
const MAX_HISTORY = 20

// AI output preview state
const [aiPreview, setAiPreview] = useState(null)
// shape: { aiContent: string, actionLabel: string, retryFn: () => Promise<string> } | null

// Toast hook
const { showToast } = useToast()
```

### Content history implementation

```js
// Push current content to history before any AI replacement
const pushHistory = (currentContent) => {
  setContentHistory(prev => {
    const next = [...prev, currentContent]
    return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
  })
}

// Undo: pop last content from history
const handleUndo = () => {
  if (contentHistory.length === 0) return
  const previous = contentHistory[contentHistory.length - 1]
  setContentHistory(prev => prev.slice(0, -1))
  setContent(previous)
  setCharCount(previous.length)
  onContentChange?.(previous)
}
```

### AI preview integration

```js
// Called by AiSidebar (via App.jsx prop drilling or direct) when AI produces a result
const handleAiResult = (aiContent, actionLabel, retryFn) => {
  setAiPreview({ aiContent, actionLabel, retryFn })
}

// Accept: apply AI content, push old content to history
const handleAcceptAi = () => {
  if (!aiPreview) return
  pushHistory(content)
  const newContent = aiPreview.aiContent
  if (newContent.length <= MAX_CHARS) {
    setContent(newContent)
    setCharCount(newContent.length)
    onContentChange?.(newContent)
  }
  setAiPreview(null)
  showToast('Changes applied', 'success')
}

// Discard: close preview, keep original
const handleDiscardAi = () => {
  setAiPreview(null)
  showToast('Changes discarded', 'info')
}

// Retry: re-run the same AI action
const handleRetryAi = async () => {
  if (!aiPreview?.retryFn) return
  try {
    const newResult = await aiPreview.retryFn()
    setAiPreview(prev => ({ ...prev, aiContent: newResult }))
  } catch (err) {
    showToast(err.message, 'error')
  }
}
```

### Replacing alert() calls

| Current alert | Replacement |
|---|---|
| `alert('Please write something first!')` | `showToast('Please write something first', 'warning')` + early return |
| `alert('Please pick a date!')` | `showToast('Please pick a date', 'warning')` + early return |
| `alert('Please pick a time!')` | `showToast('Please pick a time', 'warning')` + early return |
| `alert('Invalid date/time!')` | `showToast('Invalid date or time', 'error')` + early return |
| `alert('Schedule time must be in the future!')` | `showToast('Schedule time must be in the future', 'warning')` + early return |

Note: The `alert('Draft saved!')` and `alert('Post scheduled!')` calls are in `App.jsx`, not PostComposer. Those get replaced in Step 5.

### Updated JSX structure

```jsx
return (
  <div className="post-composer">
    <h2>Compose New Post</h2>

    <FormattingToolbar textareaRef={textareaRef} onTextChange={handleTextChange} />

    <textarea
      ref={textareaRef}
      className={`post-textarea has-toolbar ${aiPreview ? 'dimmed' : ''}`}
      placeholder="What's on your mind? Share your thoughts with your LinkedIn network..."
      value={content}
      onChange={handleContentChange}
      disabled={!!aiPreview}
    />

    <div className="char-count-row">
      <span className="char-count">{charCount} / {MAX_CHARS} characters</span>
      {contentHistory.length > 0 && (
        <button className="undo-btn" onClick={handleUndo} title="Undo last AI change">
          Undo
        </button>
      )}
    </div>

    {/* AI Output Preview - shown when AI has generated content */}
    {aiPreview && (
      <AiOutputPreview
        originalContent={content}
        aiContent={aiPreview.aiContent}
        actionLabel={aiPreview.actionLabel}
        onAccept={handleAcceptAi}
        onDiscard={handleDiscardAi}
        onRetry={handleRetryAi}
        isRetrying={false /* or track retry loading state */}
      />
    )}

    <ImageUpload
      onImageSelect={handleImageSelect}
      currentImage={image}
      onRemove={handleRemoveImage}
    />

    <div className="first-comment-section">
      <h3>First Comment (optional)</h3>
      <p className="first-comment-hint">
        Links in the first comment get better reach than links in the post body.
      </p>
      <textarea
        className="first-comment-textarea"
        placeholder="Add a first comment with your link, hashtags, or CTA..."
        value={firstComment}
        onChange={(e) => { setFirstComment(e.target.value); onFirstCommentChange?.(e.target.value) }}
      />
    </div>

    <div className="schedule-section">
      <h3>Schedule Post</h3>
      <div className="schedule-inputs">
        <div className="input-group">
          <label>Date</label>
          <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Time</label>
          <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
        </div>
      </div>
    </div>

    {/* STICKY bottom action bar */}
    <div className="composer-actions sticky-bottom">
      <button className="btn btn-secondary" onClick={resetForm}>Clear</button>
      <button className="btn btn-tertiary" onClick={handleSaveDraft}>Save as Draft</button>
      <button className="btn btn-primary" onClick={handleSchedule}>Schedule Post</button>
    </div>
  </div>
)
```

### Key removals from PostComposer

```diff
- import HookTemplates from './HookTemplates'
- import AiAssistant from './AiAssistant'
- import ViralFrameworks from './ViralFrameworks'

- <HookTemplates onInsertHook={handleInsertHook} onInsertEnding={handleInsertEnding} />
- {aiEnabled && <ViralFrameworks onContentUpdate={handleAiContentUpdate} />}
- {aiEnabled && <AiAssistant content={content} onContentUpdate={handleAiContentUpdate} onFirstCommentUpdate={handleAiFirstCommentUpdate} />}
```

### New props for PostComposer

```jsx
export default function PostComposer({
  onSaveDraft,
  onSchedule,
  onContentChange,
  onImageChange,
  onFirstCommentChange,
  // Removed: aiEnabled (no longer needed; AI is in the sidebar which is external)
  // New: expose content and handlers for the sidebar to use
  content: externalContent,    // lifted state from App (optional, see Step 5)
  onAiResult: externalAiResult // callback from sidebar (optional, see Step 5)
})
```

**Decision on state lifting:** The cleanest approach is to lift `content`, `firstComment`, and `image` state to App.jsx (they are already partially lifted via the `onContentChange`/`onImageChange`/`onFirstCommentChange` callbacks and the `composerContent`/`composerImage`/`composerFirstComment` state in App). In the redesign, we make App the single source of truth and PostComposer becomes a controlled component. This allows AiSidebar (rendered in App) to read `content` and write AI results without prop-threading through PostComposer. See Step 5 for details.

### CSS additions for PostComposer.css

```css
/* Sticky bottom action bar */
.composer-actions.sticky-bottom {
  position: sticky;
  bottom: 0;
  background: white;
  padding: 16px 0;
  margin: 0 -24px -24px;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  z-index: 5;
}

/* Dimmed textarea when AI preview is active */
.post-textarea.dimmed {
  opacity: 0.5;
  pointer-events: none;
}

/* Undo button in char count row */
.char-count-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0 15px 0;
}

.undo-btn {
  background: none;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 0.8rem;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.undo-btn:hover {
  border-color: #0a66c2;
  color: #0a66c2;
}
```

### Files changed after this step
- `src/components/PostComposer.jsx` (modified)
- `src/components/PostComposer.css` (modified)

---

## Step 5: App.jsx Layout Changes

**Modified file:** `src/App.jsx`
**Modified file:** `src/App.css`

### Changes overview

1. Replace two-column `left-panel / right-panel` with `editor-area + sidebar` layout
2. Move PostPreview and ContentScore out of the right panel (they move into AiSidebar)
3. PostCalendar, PostHistory, PostList stay below the composer in a full-width section
4. Add AiSidebar component with open/close state
5. Wrap app with `ToastProvider`
6. Replace all `alert()` calls with `showToast()`
7. Lift content/image/firstComment state to make PostComposer controlled

### State changes in App.jsx

```js
// Existing state (unchanged):
const [posts, setPosts] = useState([])
const [editingPost, setEditingPost] = useState(null)
const [showEditModal, setShowEditModal] = useState(false)
const [showSettingsModal, setShowSettingsModal] = useState(false)
const [linkedInStatus, setLinkedInStatus] = useState({ connected: false })
const [publishing, setPublishing] = useState(null)
const [composerContent, setComposerContent] = useState('')
const [composerImage, setComposerImage] = useState(null)
const [composerFirstComment, setComposerFirstComment] = useState('')

// New state:
const [sidebarOpen, setSidebarOpen] = useState(true) // AI sidebar open by default on desktop
const [aiPreview, setAiPreview] = useState(null) // lifted from PostComposer for shared access
const [contentHistory, setContentHistory] = useState([]) // lifted from PostComposer
```

### Replacing alert() calls in App.jsx

| Current | Replacement |
|---|---|
| `alert('Draft saved!')` | `showToast('Draft saved', 'success')` |
| `alert('Post scheduled!')` | `showToast('Post scheduled', 'success')` |
| `alert('Post updated!')` | `showToast('Post updated', 'success')` |
| `alert('Post deleted!')` | `showToast('Post deleted', 'success')` |
| `alert('Please connect your LinkedIn account first.')` | `showToast('Please connect your LinkedIn account first', 'warning')` |
| `alert('Post published to LinkedIn!')` | `showToast('Post published to LinkedIn!', 'success')` |
| `alert('Failed to publish: ...')` | `showToast('Failed to publish: ...', 'error')` |
| `alert('LinkedIn connection failed: ...')` | `showToast('LinkedIn connection failed: ...', 'error')` |
| `window.confirm('Delete this post?')` | Keep as `window.confirm` for now (confirm is harder to replace without a modal component; this can be a follow-up) |
| `window.confirm('Publish this post to LinkedIn now?')` | Same -- keep as `window.confirm` for now |

### Updated JSX structure

```jsx
return (
  <ToastProvider>
    <div className="app">
      <header className="app-header">
        {/* unchanged */}
      </header>

      <div className="app-container">
        <div className="editor-area">
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
            contentHistory={contentHistory}
            onUndo={handleUndo}
          />
        </div>

        {sidebarOpen && (
          <AiSidebar
            content={composerContent}
            composerImage={composerImage}
            firstComment={composerFirstComment}
            onAiResult={handleAiResult}
            onInsertHook={handleInsertHook}
            onInsertEnding={handleInsertEnding}
            onFirstCommentResult={(comment) => setComposerFirstComment(comment)}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(false)}
          />
        )}

        {!sidebarOpen && (
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(true)}
            title="Open AI sidebar"
          >
            AI Tools
          </button>
        )}
      </div>

      {/* Full-width section below composer for calendar, history, post list */}
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

      {/* Modals unchanged */}
    </div>
  </ToastProvider>
)
```

### Handler functions moved/added to App.jsx

```js
// Hook/ending insertion (previously in PostComposer)
const handleInsertHook = (hook) => {
  const newContent = composerContent ? `${hook}\n\n${composerContent}` : hook
  if (newContent.length <= 3000) setComposerContent(newContent)
}

const handleInsertEnding = (ending) => {
  const newContent = composerContent ? `${composerContent}\n\n${ending}` : ending
  if (newContent.length <= 3000) setComposerContent(newContent)
}

// AI result handler (triggers AiOutputPreview in PostComposer)
const handleAiResult = (aiContent, actionLabel, retryFn) => {
  setAiPreview({ aiContent, actionLabel, retryFn })
}

// Accept AI content
const handleAcceptAi = () => {
  if (!aiPreview) return
  setContentHistory(prev => [...prev, composerContent].slice(-20))
  setComposerContent(aiPreview.aiContent)
  setAiPreview(null)
}

// Discard AI content
const handleDiscardAi = () => {
  setAiPreview(null)
}

// Retry AI generation
const handleRetryAi = async () => {
  if (!aiPreview?.retryFn) return
  const newResult = await aiPreview.retryFn()
  setAiPreview(prev => ({ ...prev, aiContent: newResult }))
}

// Undo
const handleUndo = () => {
  if (contentHistory.length === 0) return
  const previous = contentHistory[contentHistory.length - 1]
  setContentHistory(prev => prev.slice(0, -1))
  setComposerContent(previous)
}
```

### CSS layout changes for App.css

```css
/* Replace .app-container grid */
.app-container {
  display: flex;
  gap: 20px;
  padding: 30px 20px;
  max-width: 1400px;
  margin: 0 auto;
  align-items: flex-start;
}

.editor-area {
  flex: 1;
  min-width: 0; /* prevent flex overflow */
}

/* Remove .left-panel, .right-panel classes */

/* Below-composer full-width section */
.app-below-composer {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px 30px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Sidebar toggle button (when sidebar is collapsed) */
.sidebar-toggle-btn {
  position: sticky;
  top: 20px;
  background: #0a66c2;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
  height: fit-content;
}

@media (max-width: 1024px) {
  .app-container {
    flex-direction: column;
  }

  .app-below-composer {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .app-container {
    padding: 15px;
    gap: 15px;
  }

  .app-below-composer {
    padding: 0 15px 15px;
    gap: 15px;
  }
}
```

### Files changed after this step
- `src/App.jsx` (modified)
- `src/App.css` (modified)

---

## Step 6: Update Tests

**Modified files:**
- `src/components/__tests__/PostComposer.test.jsx`
- `src/components/__tests__/AiAssistant.test.jsx` (delete or archive)
- `src/components/__tests__/ViralFrameworks.test.jsx` (delete or archive)
- `src/components/__tests__/HookTemplates.test.jsx` (delete or archive)
- `src/components/__tests__/AiSidebar.test.jsx` (new)
- `src/components/__tests__/AiOutputPreview.test.jsx` (new)
- `src/components/__tests__/ToastNotification.test.jsx` (new)

### PostComposer.test.jsx changes

The existing 17 tests need updating:

1. **Remove `vi.mock('../../utils/aiUtils')`** -- PostComposer no longer imports AI panels that depend on aiUtils
2. **Remove test:** `'does not render AI assistant or viral frameworks when aiEnabled is false'`
3. **Remove test:** `'renders AI assistant and viral frameworks when aiEnabled is true'`
4. **Remove test:** `'renders the hook templates toggle'`
5. **Update alert tests** to use toast mock:
   - Mock `useToast` to return a `showToast` spy
   - Assert `showToast` was called instead of `globalThis.alert`
6. **Add new tests:**
   - `'renders undo button when content history exists'`
   - `'hides undo button when content history is empty'`
   - `'shows AiOutputPreview when aiPreview prop is provided'`
   - `'hides AiOutputPreview when aiPreview is null'`
   - `'dims textarea when AI preview is active'`
   - `'renders sticky bottom action bar'`

Mock setup for toast:
```js
vi.mock('../ToastNotification', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }) => children,
}))
```

### New: AiSidebar.test.jsx

Test categories:

**Rendering:**
- Renders 4 tab buttons: Generate, Refine, Templates, Preview
- Shows Generate tab content by default
- Switches tab content when tabs are clicked

**Generate tab:**
- Shows topic input field
- Shows Generate Post and Get Ideas buttons
- Shows framework chips grid
- Shows framework detail when chip is clicked
- Calls `onAiResult` (not `onContentUpdate`) when generating from topic
- Calls `onAiResult` when generating from framework

**Refine tab:**
- Shows quick action buttons (Improve, Punchier, Shorten, Add a Hook)
- Disables refine buttons when content is empty
- Enables refine buttons when content exists
- Shows tone menu when Change Tone is clicked
- Calls `onAiResult` when Improve Post is clicked
- Calls `onAiResult` when a tone is selected
- Calls `onAiResult` when Add Hashtags is clicked (not direct append)
- Calls `onFirstCommentResult` when Suggest First Comment is clicked

**Templates tab:**
- Shows hook categories: Story, Curiosity, Contrarian, Listicle, Question
- Shows Story hooks by default
- Switches categories on click
- Calls `onInsertHook` when a hook is clicked
- Calls `onInsertEnding` when an ending is clicked

**Preview tab:**
- Renders PostPreview with content and image
- Renders ContentScore with content and firstComment

Mock setup:
```js
vi.mock('../../utils/aiUtils', () => ({
  generatePost: vi.fn(),
  generateHashtags: vi.fn(),
  rewritePost: vi.fn(),
  improvePost: vi.fn(),
  generatePostIdeas: vi.fn(),
  generateFirstComment: vi.fn(),
  generateFromFramework: vi.fn(),
}))
```

### New: AiOutputPreview.test.jsx

Tests:
- Renders action label in header
- Renders AI content in preview body
- Calls onAccept when Accept button is clicked
- Calls onDiscard when Discard button is clicked
- Calls onRetry when Retry button is clicked
- Shows spinner on Retry button when isRetrying is true
- Calls onDiscard when Escape key is pressed
- Shows "Start Over" instead of "Discard" when originalContent is empty

### New: ToastNotification.test.jsx

Tests:
- ToastProvider renders children
- showToast adds a toast to the container
- Toast auto-dismisses after duration
- Toast can be manually dismissed via close button
- Multiple toasts stack correctly
- Toasts have correct type-based styling classes

### Deprecated test files

The following test files are deleted since their components are deprecated. Their test coverage is replaced by AiSidebar.test.jsx:

- `AiAssistant.test.jsx` -- 14 tests, all covered by AiSidebar Refine + Generate tab tests
- `ViralFrameworks.test.jsx` -- 13 tests, all covered by AiSidebar Generate tab tests
- `HookTemplates.test.jsx` -- 9 tests, all covered by AiSidebar Templates tab tests

**Test migration map:**

| Old test | New location |
|---|---|
| AiAssistant: `'renders collapsed toggle'` | Removed (sidebar has no collapsed state per-panel) |
| AiAssistant: `'expands when toggle clicked'` | AiSidebar: `'shows Refine tab content when Refine tab clicked'` |
| AiAssistant: `'disables buttons when empty'` | AiSidebar: `'disables refine buttons when content is empty'` |
| AiAssistant: `'enables buttons when content'` | AiSidebar: `'enables refine buttons when content exists'` |
| AiAssistant: `'shows topic input'` | AiSidebar: `'shows topic input in Generate tab'` |
| AiAssistant: `'shows tone menu'` | AiSidebar: `'shows tone menu in Refine tab'` |
| AiAssistant: `'calls improvePost'` | AiSidebar: `'calls onAiResult when Improve Post clicked'` |
| AiAssistant: `'appends hashtags'` | AiSidebar: `'calls onAiResult when Add Hashtags clicked'` |
| AiAssistant: `'generates first comment'` | AiSidebar: `'calls onFirstCommentResult when Suggest First Comment clicked'` |
| AiAssistant: `'displays error'` | AiSidebar: `'displays error message on API failure'` |
| AiAssistant: `'generates from topic'` | AiSidebar: `'calls onAiResult when generating from topic'` |
| AiAssistant: `'generates ideas'` | AiSidebar: `'generates post ideas from topic'` |
| AiAssistant: `'rewrites in tone'` | AiSidebar: `'calls onAiResult when tone selected'` |
| ViralFrameworks: all 13 tests | AiSidebar: Generate tab tests |
| HookTemplates: all 9 tests | AiSidebar: Templates tab tests |

### Files changed after this step
- `src/components/__tests__/PostComposer.test.jsx` (modified)
- `src/components/__tests__/AiAssistant.test.jsx` (deleted)
- `src/components/__tests__/ViralFrameworks.test.jsx` (deleted)
- `src/components/__tests__/HookTemplates.test.jsx` (deleted)
- `src/components/__tests__/AiSidebar.test.jsx` (new)
- `src/components/__tests__/AiOutputPreview.test.jsx` (new)
- `src/components/__tests__/ToastNotification.test.jsx` (new)

---

## Step 7: Build, Test, Cleanup, Commit

### 7a. Delete deprecated component files

These files are no longer imported anywhere after the redesign:

- `src/components/HookTemplates.jsx`
- `src/components/HookTemplates.css`
- `src/components/ViralFrameworks.jsx`
- `src/components/ViralFrameworks.css`
- `src/components/AiAssistant.jsx`
- `src/components/AiAssistant.css`

Do NOT delete these until all tests pass. Keep them in the working tree during development as reference.

### 7b. Run tests

```bash
npx vitest run
```

Fix any failures. Expected areas of concern:
- PostComposer tests that reference removed elements (hook templates toggle, AI panels)
- Mock setup changes for toast context
- New tests may need adjustment for async AI calls

### 7c. Run build

```bash
npm run build
```

Fix any build errors. Common issues:
- Unused imports in modified files
- Missing imports in new files
- CSS class conflicts

### 7d. Manual verification checklist

- [ ] Composer textarea is prominent and large
- [ ] Bottom action bar (Clear, Save Draft, Schedule) is sticky and always visible
- [ ] AI sidebar opens/closes correctly
- [ ] All 4 sidebar tabs render their content
- [ ] Generate tab: topic generation and framework generation both trigger AiOutputPreview
- [ ] Refine tab: all buttons call AI and show results in AiOutputPreview
- [ ] Templates tab: hooks prepend, endings append (no AiOutputPreview for these)
- [ ] Preview tab: shows PostPreview and ContentScore
- [ ] AiOutputPreview: Accept applies content, Discard keeps original, Retry regenerates
- [ ] Undo button appears after accepting AI changes
- [ ] Undo restores previous content
- [ ] Toast notifications appear instead of alert() for all validation and success messages
- [ ] Mobile layout: sidebar becomes full-screen overlay
- [ ] Hashtags go through accept/discard flow instead of blind append

### 7e. Commit

```bash
git add -A
git commit -m "Redesign PostComposer: consolidated AI sidebar, accept/discard flow, content history, toast notifications"
```

---

## Summary of All New/Modified/Deleted Files

### New files (6)
| File | Purpose |
|------|---------|
| `src/components/ToastNotification.jsx` | Toast provider, hook, and container |
| `src/components/ToastNotification.css` | Toast styles |
| `src/components/AiOutputPreview.jsx` | Accept/discard/retry overlay for AI output |
| `src/components/AiOutputPreview.css` | Preview overlay styles |
| `src/components/AiSidebar.jsx` | Tabbed AI sidebar (Generate, Refine, Templates, Preview) |
| `src/components/AiSidebar.css` | Sidebar styles |
| `src/data/hookTemplates.js` | Extracted HOOKS and ENDINGS data arrays |

### New test files (3)
| File | Purpose |
|------|---------|
| `src/components/__tests__/ToastNotification.test.jsx` | Toast tests |
| `src/components/__tests__/AiOutputPreview.test.jsx` | Preview overlay tests |
| `src/components/__tests__/AiSidebar.test.jsx` | Consolidated sidebar tests (~30 tests) |

### Modified files (4)
| File | Changes |
|------|---------|
| `src/components/PostComposer.jsx` | Remove 3 AI panels, add history/preview/toast integration, sticky toolbar |
| `src/components/PostComposer.css` | Sticky toolbar, dimmed state, undo button, char-count-row |
| `src/App.jsx` | New layout, ToastProvider, sidebar state, lifted content state, replace alerts |
| `src/App.css` | Flexbox layout, remove left/right panel, add editor-area + below-composer |

### Modified test files (1)
| File | Changes |
|------|---------|
| `src/components/__tests__/PostComposer.test.jsx` | Remove AI panel tests, add history/preview/toast tests |

### Deleted files (6 components + 3 tests)
| File | Reason |
|------|--------|
| `src/components/HookTemplates.jsx` | Merged into AiSidebar Templates tab |
| `src/components/HookTemplates.css` | Merged into AiSidebar.css |
| `src/components/ViralFrameworks.jsx` | Merged into AiSidebar Generate tab |
| `src/components/ViralFrameworks.css` | Merged into AiSidebar.css |
| `src/components/AiAssistant.jsx` | Merged into AiSidebar Generate + Refine tabs |
| `src/components/AiAssistant.css` | Merged into AiSidebar.css |
| `src/components/__tests__/HookTemplates.test.jsx` | Replaced by AiSidebar.test.jsx |
| `src/components/__tests__/ViralFrameworks.test.jsx` | Replaced by AiSidebar.test.jsx |
| `src/components/__tests__/AiAssistant.test.jsx` | Replaced by AiSidebar.test.jsx |

### Unchanged files
| File | Notes |
|------|-------|
| `src/components/FormattingToolbar.jsx` | No changes needed |
| `src/components/PostPreview.jsx` | No changes; rendered inside AiSidebar Preview tab |
| `src/components/ContentScore.jsx` | No changes; rendered inside AiSidebar Preview tab |
| `src/components/ImageUpload.jsx` | No changes |
| `src/utils/aiUtils.js` | No changes; all existing functions reused |
| `src/data/viralFrameworks.js` | No changes; imported by AiSidebar |
| All other components/utils | No changes |
