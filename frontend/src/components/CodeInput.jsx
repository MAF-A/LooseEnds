import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { FaWandMagicSparkles, FaEraser, FaUpload, FaFileImport, FaPlay } from 'react-icons/fa6'

const MAX_CHARS = 20000
const SECRET_PATTERN = /(AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{24}|ghp_[0-9a-zA-Z]{36})/

export default function CodeInput({ onSubmit, loading, initialCode, isDarkMode }) {
  const [code, setCode] = useState(initialCode || '')
  const [language, setLanguage] = useState('python')
  const [explainSimply, setExplainSimply] = useState(false)
  const [conventionRules, setConventionRules] = useState('')
  
  // Context Awareness State
  const [programContext, setProgramContext] = useState('')
  const [generateComments, setGenerateComments] = useState(false)
  const [awareOfComments, setAwareOfComments] = useState(false)
  const [autoIndent, setAutoIndent] = useState(false)

  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (initialCode !== undefined) setCode(initialCode)
  }, [initialCode])

  const tooLong = code.length > MAX_CHARS
  const hasSecret = SECRET_PATTERN.test(code)
  const canSubmit = code.trim().length > 0 && !tooLong && !hasSecret && !loading

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({ 
      code, language, explain_simply: explainSimply, 
      convention_rules: conventionRules,
      program_context: programContext,
      generate_comments: generateComments, aware_of_comments: awareOfComments,
      auto_indent: autoIndent
    })
  }

  function handleDrag(e) {
    e.preventDefault(); e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0])
  }

  function readFile(file) {
    const reader = new FileReader()
    reader.onload = (e) => setCode(e.target.result)
    reader.readAsText(file)
  }

  function handleEditorWillMount(monaco) {
    monaco.editor.defineTheme('looseends-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'e5484d', fontStyle: 'bold' },
        { token: 'string', foreground: '00ffcc' },
        { token: 'number', foreground: 'f5b400' },
        { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
        { token: 'type', foreground: '3b82f6' },
        { token: 'function', foreground: 'f5b400' }
      ],
      colors: {
        'editor.background': '#0b0d11',
        'editor.lineHighlightBackground': '#13161c',
        'editorLineNumber.foreground': '#4a5261',
        'editorLineNumber.activeForeground': '#f5b400',
        'editor.selectionBackground': '#262b36',
      }
    })
  }

  const editorTheme = isDarkMode ? 'looseends-dark' : 'vs-light'

  return (
    <form className="code-input" onSubmit={handleSubmit}>
      <div className="code-input-header">
        <label>AI-generated code</label>
        <div className="code-input-actions">
          <button type="button" className="text-btn" onClick={() => fileInputRef.current.click()} disabled={loading}>
            <FaUpload aria-hidden="true" /> <span>Upload</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={e => e.target.files[0] && readFile(e.target.files[0])} style={{ display: 'none' }} />
          {code.length > 0 && (
            <button type="button" className="text-btn" onClick={() => setCode('')} disabled={loading}>
              <FaEraser aria-hidden="true" /> <span>Clear</span>
            </button>
          )}
          <span className={`char-count ${tooLong ? 'over' : ''}`}>{code.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>
        </div>
      </div>

      <div className={`drop-zone ${dragActive ? 'drag-active' : ''}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
        <Editor
          height="350px" 
          language={language === 'auto' ? 'plaintext' : language} 
          theme={editorTheme}
          value={code} 
          onChange={val => setCode(val || '')}
          beforeMount={handleEditorWillMount}
          options={{ 
            minimap: { enabled: false }, 
            fontSize: 13, 
            fontFamily: 'var(--font-mono)', 
            wordWrap: 'on', 
            scrollBeyondLastLine: false, 
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: isDarkMode ? 'all' : 'none',
          }}
        />
        {dragActive && <div className="drop-overlay"><FaFileImport size={32} /><p>Drop file to import</p></div>}
      </div>

      {(tooLong || hasSecret) && (
        <p className="inline-error">
          {tooLong ? "Code exceeds 20,000 character limit." : "Potential secret detected. Remove API keys."}
        </p>
      )}

      <div className="code-options">
        <div className="option-group">
          <label>Language</label>
          <select value={language} onChange={e => setLanguage(e.target.value)} disabled={loading}>
            <option value="auto">Auto-detect</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript / TypeScript</option>
          </select>
        </div>
        
        <div className="toggle-group">
          <label className="toggle">
            <input type="checkbox" checked={explainSimply} onChange={e => setExplainSimply(e.target.checked)} disabled={loading} />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Explain simply</span>
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Program Context
          </label>
          <textarea 
            className="rules-input" 
            style={{ width: '100%', minHeight: '80px', resize: 'vertical', lineHeight: '1.5' }}
            placeholder="Describe what you are building and what this code is used for. For example: 'This is a REST API endpoint for a banking app. It handles user withdrawals and needs to be highly secure.'" 
            value={programContext} 
            onChange={e => setProgramContext(e.target.value)} 
            disabled={loading}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Convention Rules
          </label>
          <textarea 
            className="rules-input" 
            style={{ width: '100%', minHeight: '80px', resize: 'vertical', lineHeight: '1.5' }}
            placeholder="Paste your team's coding standards or .eslintrc rules here (optional). For example: 'All variables must be snake_case. No single-letter variables allowed. Always add type hints.'" 
            value={conventionRules} 
            onChange={e => setConventionRules(e.target.value)} 
            disabled={loading}
          />
        </div>
      </div>

      <div className="code-options" style={{ marginTop: '0' }}>
        <div className="toggle-group">
          <label className="toggle">
            <input type="checkbox" checked={generateComments} onChange={e => setGenerateComments(e.target.checked)} disabled={loading} />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Add comments</span>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={awareOfComments} onChange={e => setAwareOfComments(e.target.checked)} disabled={loading} />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Respect comments</span>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={autoIndent} onChange={e => setAutoIndent(e.target.checked)} disabled={loading} />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Auto-indent</span>
          </label>
        </div>
      </div>

      <div className="code-input-footer" style={{ marginTop: '12px' }}>
        <button type="submit" className="primary-btn" disabled={!canSubmit} style={{ whiteSpace: 'nowrap', width: '100%' }}>
          {loading ? <><span className="spinner" /> Running Engine</> : <><FaPlay /> Run Definitive Engine</>}
        </button>
      </div>
    </form>
  )
}