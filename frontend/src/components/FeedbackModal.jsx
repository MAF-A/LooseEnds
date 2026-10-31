import { useState } from 'react'
import { FaXmark, FaThumbsUp, FaBrain, FaFloppyDisk } from 'react-icons/fa6'
import { sendFeedback } from '../api/review'

export default function FeedbackModal({ isOpen, onClose, originalCode, aiFinalCode }) {
  const [userCorrectedCode, setUserCorrectedCode] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await sendFeedback(originalCode, aiFinalCode, userCorrectedCode, reason)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setUserCorrectedCode('')
        setReason('')
      }, 2000)
    } catch (err) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <header className="modal-header">
          <div className="modal-title"><FaBrain /> Teach the AI</div>
          <button type="button" className="icon-btn" onClick={onClose}><FaXmark /></button>
        </header>
        
        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#22c55e' }}>
            <FaThumbsUp size={48} style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: 0, fontSize: '18px' }}>Rule Learned!</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>The AI has permanently updated its memory vault.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="modal-desc">
              If the engine missed something or made a mistake, paste the correct code below. 
              The system will distill this into a new "Golden Rule" that applies to all future reviews.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI's Final Code
              </label>
              <pre style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px', fontSize: '11px', color: 'var(--text)', overflowX: 'auto', maxHeight: '100px', margin: 0 }}>
                {aiFinalCode}
              </pre>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Corrected Code
              </label>
              <textarea
                className="rules-input"
                style={{ width: '100%', minHeight: '100px', fontFamily: 'var(--font-mono)', fontSize: '12px', resize: 'vertical' }}
                value={userCorrectedCode}
                onChange={e => setUserCorrectedCode(e.target.value)}
                placeholder="Paste the correct code here..."
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Why was the AI wrong? (Context)
              </label>
              <input
                type="text"
                className="rules-input"
                style={{ width: '100%' }}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g., 'It broke the indentation', 'isinstance must come first'"
                required
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="text-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Distilling Rule...' : <><FaFloppyDisk /> Save to Memory Vault</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}