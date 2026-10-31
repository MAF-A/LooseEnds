import { FaGaugeHigh } from 'react-icons/fa6'
import { countBySeverity, calculateScore } from '../lib/severity'
import TieKnot from './TieKnot'

export default function SummaryBar({ summary, issues, activeFilters, setActiveFilters }) {
  const counts = countBySeverity(issues)
  const total = issues.length
  const score = calculateScore(issues)

  // Clean State (0 issues)
  if (total === 0) {
    return (
      <div className="summary-bar summary-clean">
        <div className="clean-content">
          <TieKnot />
          <div>
            <h3 className="clean-title">All tied off.</h3>
            <p className="clean-desc">{summary || 'No issues found. Ready to merge.'}</p>
          </div>
        </div>
        <div className="score-badge score-perfect">Score: 100</div>
      </div>
    )
  }

  // Toggle filter function
  const toggleFilter = (sev) => {
    const next = new Set(activeFilters)
    if (next.has(sev)) next.delete(sev)
    else next.add(sev)
    setActiveFilters(next)
  }

  // Determine score color
  let scoreColor = 'score-good'
  if (score < 50) scoreColor = 'score-bad'
  else if (score < 80) scoreColor = 'score-warn'

  // Issues Found State
  return (
    <div className="summary-bar">
      <div className="summary-main">
        <FaGaugeHigh aria-hidden="true" />
        <p>{summary}</p>
      </div>
      
      <div className="summary-pills">
        {['high', 'medium', 'low'].map(sev => {
          if (counts[sev] === 0) return null
          const isActive = activeFilters.has(sev)
          return (
            <button 
              key={sev} 
              type="button"
              className={`pill pill-${sev} ${isActive ? 'active' : 'inactive'}`}
              onClick={() => toggleFilter(sev)}
              title={`Toggle ${sev} issues`}
            >
              <span>{counts[sev]}</span> {sev}
            </button>
          )
        })}
        <div className={`score-badge ${scoreColor}`}>Score: {score}</div>
      </div>
    </div>
  )
}