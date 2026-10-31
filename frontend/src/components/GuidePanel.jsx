import { useState } from 'react'
import { FaCircleQuestion, FaXmark, FaChevronDown, FaRobot, FaBrain, FaShieldHalved } from 'react-icons/fa6'

const STEPS = [
  {
    title: 'Static & Security Review',
    icon: FaShieldHalved,
    body: 'Paste your code and the AI will aggressively scan for SQL injection, logic holes, unhandled exceptions, and convention violations. It provides a concrete fix and a unit test for every issue it finds.'
  },
  {
    title: 'Autonomous Fuzzing Loop',
    icon: FaRobot,
    body: 'Provide a function name to activate the Fuzzer. The backend will actually execute your code against a matrix of malicious inputs (None, negative numbers, strings). When it crashes, the AI reads the traceback, auto-applies a fix, and re-runs the fuzzer until the code is completely bulletproof.'
  },
  {
    title: 'Teach the AI (Memory Vault)',
    icon: FaBrain,
    body: 'If the AI makes a mistake, click "Teach AI" on any issue card. Paste your correction, and the system will distill it into a generalized "Golden Rule." This rule is saved to a persistent database and injected into all future prompts, regardless of which AI model you are using.'
  }
]

export default function GuidePanel() {
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState(0) // Default to the first step open

  if (!open) {
    return (
      <button type="button" className="guide-reopen glass-panel" onClick={() => setOpen(true)}>
        <FaCircleQuestion aria-hidden="true" />
        <span>How it works</span>
      </button>
    )
  }

  return (
    <aside className="guide-panel" aria-label="How LooseEnds works">
      <header className="guide-header">
        <div className="guide-title">
          <FaCircleQuestion aria-hidden="true" />
          <span>The Engine</span>
        </div>
        <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close guide">
          <FaXmark aria-hidden="true" />
        </button>
      </header>

      <ol className="guide-steps">
        {STEPS.map((step, i) => {
          const isOpen = expanded === i
          const Icon = step.icon
          return (
            <li key={step.title} className="guide-step">
              <button
                type="button"
                className="guide-step-toggle"
                onClick={() => setExpanded(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span className="guide-step-num" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}>
                  <Icon />
                </span>
                <span className="guide-step-title">{step.title}</span>
                <FaChevronDown className={`chevron ${isOpen ? 'rotated' : ''}`} aria-hidden="true" />
              </button>
              {isOpen && <p className="guide-step-body">{step.body}</p>}
            </li>
          )
        })}
      </ol>

      <p className="guide-footnote">
        <strong>Context Features:</strong> Toggle "Add comments" to generate docstrings, "Respect comments" to keep your TODOs, and "Auto-indent" to fix messy formatting. 
        <br /><br />
        The API key never reaches the browser.
      </p>
    </aside>
  )
}