import React from 'react'
import {
  MessageThreadSummary,
  ensureDirectMessageThread,
  ensureEventMessageThread,
  getAccessibleMessageThreads,
  getMessageThread,
  getPublicIdentityLabel,
  listEvents,
  markMessageThreadRead,
  sendMessageToThread,
} from './AuthService'
import { XIcon, ArrowLeftIcon } from './Icons'

export type MessageTarget =
  | { type: 'inbox' }
  | { type: 'direct'; otherUserId: string }
  | { type: 'event'; eventId: string }

type Props = {
  open: boolean
  userId: string
  initialTarget?: MessageTarget | null
  onClose: () => void
}

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString([], { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function getInitials(label: string) {
  const cleaned = String(label || '').trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function Avatar({ label, isGroup, size = 36 }: { label: string; isGroup?: boolean; size?: number }) {
  const initials = getInitials(label)
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: isGroup ? 12 : 999,
        background: isGroup ? 'linear-gradient(135deg, rgba(var(--secondary-rgb),0.16), rgba(var(--accent-rgb),0.16))' : 'linear-gradient(135deg, var(--accent), var(--secondary))',
        color: isGroup ? 'var(--secondary)' : 'white',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size >= 36 ? 13 : 11,
        flex: '0 0 auto',
        boxShadow: isGroup ? 'inset 0 0 0 1px rgba(var(--secondary-rgb),0.12)' : '0 6px 18px rgba(var(--secondary-rgb),0.18)',
      }}
    >
      {initials}
    </div>
  )
}

export default function MessagesModal({ open, userId, initialTarget, onClose }: Props) {
  const [threads, setThreads] = React.useState<MessageThreadSummary[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [composer, setComposer] = React.useState('')

  const loadThreads = React.useCallback(() => {
    if (!userId) {
      setThreads([])
      return
    }
    setThreads(getAccessibleMessageThreads(userId))
  }, [userId])

  const openTarget = React.useCallback((target?: MessageTarget | null) => {
    if (!userId) return
    if (!target || target.type === 'inbox') {
      const summaries = getAccessibleMessageThreads(userId)
      setThreads(summaries)
      setSelectedId(null)
      return
    }
    if (target.type === 'direct') {
      const thread = ensureDirectMessageThread(userId, target.otherUserId)
      const summaries = getAccessibleMessageThreads(userId)
      setThreads(summaries)
      setSelectedId(thread?.id || null)
      return
    }
    const thread = ensureEventMessageThread(target.eventId, userId)
    const summaries = getAccessibleMessageThreads(userId)
    setThreads(summaries)
    setSelectedId(thread?.id || null)
  }, [userId])

  React.useEffect(() => {
    if (!open) {
      setComposer('')
      return
    }
    openTarget(initialTarget)
  }, [open, initialTarget, openTarget])

  React.useEffect(() => {
    if (!open) return
    const handleUpdate = () => loadThreads()
    window.addEventListener('demo1_messages_updated', handleUpdate)
    window.addEventListener('demo1_events_updated', handleUpdate)
    return () => {
      window.removeEventListener('demo1_messages_updated', handleUpdate)
      window.removeEventListener('demo1_events_updated', handleUpdate)
    }
  }, [open, loadThreads])

  const selectedSummary = React.useMemo(() => threads.find(thread => thread.id === selectedId) || null, [threads, selectedId])

  const selectedThread = React.useMemo(() => {
    if (!selectedId || !userId) return null
    if (selectedSummary?.type === 'event' && selectedSummary.eventId) {
      ensureEventMessageThread(selectedSummary.eventId, userId)
    }
    return getMessageThread(selectedId, userId)
  }, [selectedId, selectedSummary, userId])

  React.useEffect(() => {
    if (!open || !selectedId || !userId) return
    markMessageThreadRead(selectedId, userId)
    loadThreads()
  }, [open, selectedId, userId, loadThreads])

  const selectedTitle = React.useMemo(() => {
    if (!selectedSummary) return 'Messages'
    if (selectedSummary.type === 'direct' && selectedSummary.otherUserId) return getPublicIdentityLabel(selectedSummary.otherUserId)
    if (selectedSummary.eventId) {
      const event = listEvents().find(item => item.id === selectedSummary.eventId)
      return event?.title || event?.activity || selectedSummary.title
    }
    return selectedSummary.title
  }, [selectedSummary])

  const selectedSubtitle = React.useMemo(() => {
    if (!selectedSummary) return 'Choose a conversation'
    if (selectedSummary.type === 'direct') return 'Direct message'
    return 'Event group chat'
  }, [selectedSummary])

  const handleSelect = (thread: MessageThreadSummary) => {
    if (thread.type === 'event' && thread.eventId) {
      ensureEventMessageThread(thread.eventId, userId)
    }
    setSelectedId(thread.id)
  }

  const handleSend = () => {
    if (!selectedId || !composer.trim()) return
    const updated = sendMessageToThread(selectedId, userId, composer)
    if (!updated) {
      alert('Unable to send your message right now.')
      return
    }
    setComposer('')
    loadThreads()
  }

  if (!open) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Messages</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
        </div>
        <div className="modal-body" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 520 }}>
          {!selectedId ? (
            // Inbox view - full width
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, overflow: 'auto', flex: 1 }}>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700, padding: '4px 4px 8px' }}>Inbox</div>
              {threads.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 14, padding: 8 }}>No messages yet. Approved event chats and direct messages will appear here.</div>
              ) : (
                threads.map(thread => {
                  const threadLabel = thread.type === 'event' ? thread.title : (thread.otherUserId ? getPublicIdentityLabel(thread.otherUserId) : thread.title)
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => handleSelect(thread)}
                      style={{
                        textAlign: 'left',
                        border: '1px solid transparent',
                        background: 'white',
                        borderRadius: 12,
                        padding: 10,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <Avatar label={threadLabel} isGroup={thread.type === 'event'} size={36} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thread.title}</div>
                            {thread.unreadCount > 0 && (
                              <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: 'var(--secondary)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, padding: '0 6px' }}>
                                {thread.unreadCount}
                              </span>
                            )}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280', minHeight: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {thread.type === 'event' ? 'Event group chat' : 'Direct message'}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {thread.subtitle || 'No messages yet'}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          ) : (
            // Chat view - full width with back button
            <>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    color: 'var(--secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    minWidth: 24,
                  }}
                  aria-label="Back to inbox"
                >
                  <ArrowLeftIcon size={18} />
                </button>
                <Avatar label={selectedTitle} isGroup={selectedSummary?.type === 'event'} size={42} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedTitle}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{selectedSubtitle}</div>
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 280, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
                {!selectedThread || selectedThread.messages.length === 0 ? (
                  <div style={{ color: '#9ca3af' }}>No messages yet. Start the conversation below.</div>
                ) : (
                  selectedThread.messages.map(message => {
                    const mine = message.senderId === userId
                    const senderLabel = getPublicIdentityLabel(message.senderId)
                    return (
                      <div key={message.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexDirection: mine ? 'row-reverse' : 'row', maxWidth: '84%' }}>
                          <Avatar label={senderLabel} size={30} />
                          <div style={{ maxWidth: '100%', background: mine ? 'linear-gradient(135deg, var(--accent), var(--secondary))' : 'white', color: mine ? 'white' : '#0f1720', padding: '10px 12px', borderRadius: 14, boxShadow: mine ? '0 6px 18px rgba(var(--secondary-rgb),0.18)' : '0 2px 8px rgba(15,23,32,0.06)' }}>
                            {!mine && <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{senderLabel}</div>}
                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14 }}>{message.body}</div>
                            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 6 }}>{formatTime(message.sentAt)}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea
                  className="input"
                  rows={3}
                  value={composer}
                  onChange={e => setComposer(e.target.value)}
                  placeholder={selectedSummary ? 'Write a message…' : 'Choose a conversation first'}
                  disabled={!selectedSummary}
                  style={{ resize: 'none' }}
                />
                <button className="btn" type="button" onClick={handleSend} disabled={!selectedSummary || !composer.trim()} style={{ flex: '0 0 auto', minWidth: 120, opacity: !selectedSummary || !composer.trim() ? 0.65 : 1 }}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

