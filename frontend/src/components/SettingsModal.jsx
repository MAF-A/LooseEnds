import { FaXmark, FaKey, FaFloppyDisk } from 'react-icons/fa6'

export default function SettingsModal({ isOpen, onClose, apiKey, setApiKey }) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <header className="modal-header">
          <div className="modal-title" style={{ color: 'var(--accent)' }}><FaKey /> Bring Your Own Key</div>
          <button type="button" className="icon-btn" onClick={onClose}><FaXmark /></button>
        </header>
        <p className="modal-desc">
          By default, this demo uses a shared API key and is rate-limited. Paste your own Nebius or Ollama API key here to bypass limits. The key is stored locally in your browser and sent directly to the backend.
        </p>
        <input 
          type="password" 
          className="rules-input" 
          placeholder="v1.xxxxxxxxxxxxxxxx" 
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ width: '100%' }}
        />
        <div className="modal-actions">
          <button type="button" className="text-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-btn" onClick={onClose}>
            <FaFloppyDisk /> Save Key
          </button>
        </div>
      </div>
    </div>
  )
}