import { useState, useEffect } from 'react'
import SummaryBar from './SummaryBar'
import IssueCard from './IssueCard'
import FeedbackModal from './FeedbackModal'
import { sortIssues } from '../lib/severity'
import { copyText } from '../lib/clipboard'
import { FaCopy, FaCheck, FaFilter, FaBrain } from 'react-icons/fa6'

export default function ReportView({ report, codeLines, appliedFixes, originalCode }) {
  const [activeFilters, setActiveFilters] = useState(new Set(['high', 'medium', 'low']))
  const [copied, setCopied] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setActiveFilters(new Set(['high', 'medium', 'low']))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!report) return null

  const allIssues = sortIssues(report.issues ?? []).map((issue, index) => ({
    ...issue,
    originalLine: codeLines[issue.line - 1] || '',
    issueId: `${issue.line}-${issue.type}-${index}`
  }))
  
  const visibleIssues = allIssues.filter(i => activeFilters.has(i.severity))

  async function handleExport() {
    let md = `### LooseEnds Review\n**Summary:** ${report.summary}\n\n`
    allIssues.forEach(i => {
      md += `- [ ] **[${i.severity.toUpperCase()}]** line ${i.line} (${i.type}): ${i.description}\n`
      md += `  > **Fix:** ${i.fix}\n\n`
    })
    const ok = await copyText(md)
    if (ok) { 
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) 
    }
  }

  return (
    <section className="report">
      <SummaryBar summary={report.summary} issues={allIssues} activeFilters={activeFilters} setActiveFilters={setActiveFilters} />
      
      {allIssues.length > 0 && (
        <div className="report-actions">
           <span className="hint" style={{ marginRight: 'auto' }}>Press Cmd+K to clear filters</span>
           
           <button 
             type="button" 
             className="text-btn" 
             style={{ color: '#8b5cf6', marginRight: '16px' }}
             onClick={() => setIsFeedbackModalOpen(true)}
           >
             <FaBrain aria-hidden="true" /> Provide Feedback
           </button>

           <button type="button" className="text-btn" onClick={handleExport}>
             {copied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />} 
             <span>{copied ? 'Copied to clipboard' : 'Copy as Markdown'}</span>
           </button>
        </div>
      )}

      {visibleIssues.length === 0 && allIssues.length > 0 ? (
        <div className="report-empty">
          <FaFilter aria-hidden="true" />
          <span>All issues are currently filtered out. Click the severity pills above to show them.</span>
        </div>
      ) : (
        <div className="issue-list">
          {visibleIssues.map((issue) => (
            <IssueCard key={issue.issueId} issue={issue} />
          ))}
        </div>
      )}

      <FeedbackModal 
        isOpen={isFeedbackModalOpen} 
        onClose={() => setIsFeedbackModalOpen(false)} 
        originalCode={originalCode}
        aiFinalCode={codeLines.join('\n')}
      />
    </section>
  )
}