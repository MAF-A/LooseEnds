import { useState } from 'react'
import { 
  FaCopy, FaCheck, FaShield, FaRuler, FaPuzzlePiece, 
  FaCode, FaLink, FaLayerGroup, FaCodeBranch 
} from 'react-icons/fa6'
import { SEVERITY_META, TYPE_LABEL } from '../lib/severity'
import { copyText } from '../lib/clipboard'

const TYPE_ICONS = {
  logic: FaPuzzlePiece, 
  security: FaShield, 
  convention: FaRuler,
  'over-engineering': FaCode, 
  'missing-flow': FaLink, 
  complexity: FaLayerGroup,
}

export default function IssueCard({ issue }) {
  const [copied, setCopied] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  
  const meta = SEVERITY_META[issue.severity]
  const TypeIcon = TYPE_ICONS[issue.type] || FaCode

  async function handleCopy() {
    const ok = await copyText(issue.fix)
    if (ok) { 
      setCopied(true)
      setTimeout(() => setCopied(false), 1600) 
    }
  }

  return (
    <article className="issue-card" style={{ borderLeftColor: meta.border, background: meta.bg }}>
      <header className="issue-header">
        <span className="issue-badge" style={{ background: meta.badge }}>{meta.label}</span>
        <span className="issue-type"><TypeIcon aria-hidden="true" /> {TYPE_LABEL[issue.type] || issue.type}</span>
        <span className="issue-line">line {issue.line}</span>
      </header>

      <p className="issue-desc" style={{ color: meta.text }}>{issue.description}</p>

      <div className="issue-actions-row">
        <button type="button" className="text-btn" onClick={() => setShowDiff(!showDiff)}>
          <FaCodeBranch aria-hidden="true" /> {showDiff ? 'Hide Diff' : 'Show Diff'}
        </button>
        
        <span className="applied-badge" style={{ marginLeft: 'auto' }}>
          <FaCheck aria-hidden="true" /> Auto-Applied
        </span>
      </div>

      {showDiff ? (
        <div className="issue-diff">
          <div className="diff-line diff-remove">- {issue.originalLine || '(empty line)'}</div>
          <div className="diff-line diff-add">+ {issue.fix}</div>
        </div>
      ) : (
        <div className="issue-fix">
          <div className="issue-fix-header">
            <span>Suggested fix</span>
            <button type="button" className="copy-btn" onClick={handleCopy}>
              {copied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />} 
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre>{issue.fix}</pre>
        </div>
      )}

      {issue.test && (
        <div className="issue-fix" style={{ marginTop: '10px', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
          <div className="issue-fix-header" style={{ color: '#86efac', borderBottomColor: 'rgba(34, 197, 94, 0.2)' }}>
            <span>Generated Unit Test</span>
          </div>
          <pre>{issue.test}</pre>
        </div>
      )}
    </article>
  )
}